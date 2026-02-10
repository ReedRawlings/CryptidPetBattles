import OpenAI from 'openai';
import { LLMProvider, LLMResponse, TurnContext } from '../types';
import { getSystemPrompt, buildTurnPrompt } from '../prompt';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const RESPONSE_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'tournament_action',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        reasoning: {
          type: 'string',
          description: 'Your strategic thinking about what to buy, sell, or do this turn.',
        },
        actions: {
          type: 'array',
          description: 'List of actions to take this shopping turn.',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'The action name: buy, sell, roll, swap, combine, or freeze.',
              },
              params: {
                type: 'object',
                description: 'Parameters for the action. Set unused params to -1.',
                properties: {
                  shopIndex: { type: 'number', description: 'Shop slot index (0-based). Use -1 if not needed.' },
                  teamIndex: { type: 'number', description: 'Team slot index (0-4). Use -1 if not needed.' },
                  indexA: { type: 'number', description: 'First team slot for swap. Use -1 if not needed.' },
                  indexB: { type: 'number', description: 'Second team slot for swap. Use -1 if not needed.' },
                  sourceIndex: { type: 'number', description: 'Source team slot for combine. Use -1 if not needed.' },
                  targetIndex: { type: 'number', description: 'Target team slot for combine. Use -1 if not needed.' },
                },
                required: ['shopIndex', 'teamIndex', 'indexA', 'indexB', 'sourceIndex', 'targetIndex'],
                additionalProperties: false,
              },
            },
            required: ['action', 'params'],
            additionalProperties: false,
          },
        },
      },
      required: ['reasoning', 'actions'],
      additionalProperties: false,
    },
  },
};

export function createOpenAIProvider(
  name: string,
  model: string = 'gpt-4o'
): LLMProvider {
  const client = new OpenAI();

  // Persistent conversation history — system prompt sent once, turns accumulate
  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt() },
  ];

  return {
    name,
    model,
    async makeDecision(context: TurnContext): Promise<LLMResponse> {
      const turnPrompt = buildTurnPrompt(context);

      // Append this turn's state as a user message
      messages.push({ role: 'user', content: turnPrompt });

      const response = await client.chat.completions.create({
        model,
        max_completion_tokens: 16384,
        response_format: RESPONSE_SCHEMA,
        messages,
      });

      const choice = response.choices[0];
      const text = choice?.message?.content || '{}';

      // Append the assistant's response to history so it has memory next turn
      messages.push({ role: 'assistant', content: text });

      if (process.env.TOURNAMENT_DEBUG) {
        console.log(`  [${name}] RAW RESPONSE: ${text.slice(0, 500)}`);
        if (choice?.message?.refusal) console.log(`  [${name}] REFUSAL: ${choice.message.refusal}`);
        console.log(`  [${name}] FINISH: ${choice?.finish_reason}`);
        console.log(`  [${name}] MESSAGES: ${messages.length}`);
      }
      return parseResponse(text, name);
    },
  };
}

function parseResponse(raw: string, name: string): LLMResponse {
  try {
    const parsed = JSON.parse(raw);
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    if (actions.length === 0) {
      console.warn(`  [${name}] Parsed JSON but got 0 actions. Keys: ${Object.keys(parsed).join(', ')}. Raw: ${raw.slice(0, 300)}`);
    }
    return {
      reasoning: parsed.reasoning || '',
      actions,
    };
  } catch {
    console.warn(`  [${name}] Failed to parse JSON: ${raw.slice(0, 300)}`);
    return { reasoning: `Failed to parse: ${raw.slice(0, 200)}`, actions: [] };
  }
}
