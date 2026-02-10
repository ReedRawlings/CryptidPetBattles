import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse, TurnContext } from '../types';
import { getSystemPrompt, buildTurnPrompt } from '../prompt';

type MessageParam = Anthropic.MessageParam;

export function createClaudeProvider(
  name: string,
  model: string = 'claude-sonnet-4-5-20250929'
): LLMProvider {
  const client = new Anthropic();
  const systemPrompt = getSystemPrompt();

  // Persistent conversation history — turns accumulate
  const messages: MessageParam[] = [];

  return {
    name,
    model,
    async makeDecision(context: TurnContext): Promise<LLMResponse> {
      const turnPrompt = buildTurnPrompt(context);

      // Append this turn's state as a user message
      messages.push({ role: 'user', content: turnPrompt });

      const response = await client.messages.create({
        model,
        max_tokens: 16384,
        thinking: { type: 'enabled', budget_tokens: 8192 },
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Append full response content (including thinking blocks) to maintain multi-turn thinking
      messages.push({ role: 'assistant', content: response.content as any });

      return parseResponse(text);
    },
  };
}

function parseResponse(raw: string): LLMResponse {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      reasoning: parsed.reasoning || '',
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    console.warn(`[claude] Failed to parse response, attempting extraction...`);
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reasoning: parsed.reasoning || '',
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        };
      } catch {
        // Give up
      }
    }
    return { reasoning: `Failed to parse: ${raw.slice(0, 200)}`, actions: [] };
  }
}
