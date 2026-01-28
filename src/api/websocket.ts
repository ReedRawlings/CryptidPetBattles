import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { MatchState, Player, Pet } from '../models/types';
import { createPlayer, clonePlayer, getActivePets } from '../models/Player';
import { createShop } from '../game/ShopSystem';
import { resolveBattle, calculateDamageTaken } from '../game/BattleSystem';
import { incrementBattlesParticipated, resetBattleStats } from '../models/Pet';

/**
 * WebSocket handler for real-time versus mode
 */

// Match configuration
const LOBBY_SIZE = 8;
const TURN_TIMER = 45; // seconds
const MATCHMAKING_INTERVAL = 5000; // 5 seconds

// Active matches
const activeMatches: Map<string, MatchState> = new Map();
const playerToMatch: Map<string, string> = new Map();
const matchmakingQueue: Map<string, { socket: Socket; player: Player; mmr: number }> = new Map();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle joining versus matchmaking queue
    socket.on('versus:join', (data: { username: string; mmr?: number }) => {
      handleJoinMatchmaking(socket, data);
    });

    // Handle leaving matchmaking queue
    socket.on('versus:leave', () => {
      handleLeaveMatchmaking(socket);
    });

    // Handle shop actions during versus mode
    socket.on('versus:shop:buy', (data: { petIndex?: number; foodIndex?: number; targetPetId?: string }) => {
      handleVersusShopBuy(socket, data);
    });

    socket.on('versus:shop:roll', () => {
      handleVersusShopRoll(socket);
    });

    socket.on('versus:shop:sell', (data: { petId: string }) => {
      handleVersusShopSell(socket, data);
    });

    socket.on('versus:shop:freeze', (data: { slotIndex: number }) => {
      handleVersusShopFreeze(socket, data);
    });

    socket.on('versus:team:arrange', (data: { newOrder: (string | null)[] }) => {
      handleVersusTeamArrange(socket, data);
    });

    socket.on('versus:ready', () => {
      handleVersusReady(socket);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  // Start matchmaking loop
  setInterval(() => runMatchmaking(io), MATCHMAKING_INTERVAL);

  return io;
}

/**
 * Handle player joining matchmaking queue
 */
function handleJoinMatchmaking(socket: Socket, data: { username: string; mmr?: number }): void {
  const { username, mmr = 1000 } = data;

  // Check if already in queue or match
  if (matchmakingQueue.has(socket.id) || playerToMatch.has(socket.id)) {
    socket.emit('error', { message: 'Already in queue or match' });
    return;
  }

  const player = createPlayer(username);
  player.mmr = mmr;

  matchmakingQueue.set(socket.id, { socket, player, mmr });

  socket.emit('versus:queued', {
    position: matchmakingQueue.size,
    estimatedWait: Math.ceil(matchmakingQueue.size / LOBBY_SIZE) * 30,
  });

  console.log(`Player ${username} joined matchmaking queue. Queue size: ${matchmakingQueue.size}`);
}

/**
 * Handle player leaving matchmaking queue
 */
function handleLeaveMatchmaking(socket: Socket): void {
  if (matchmakingQueue.has(socket.id)) {
    matchmakingQueue.delete(socket.id);
    socket.emit('versus:left_queue', {});
    console.log(`Player left matchmaking queue. Queue size: ${matchmakingQueue.size}`);
  }
}

/**
 * Run matchmaking logic
 */
function runMatchmaking(io: SocketIOServer): void {
  if (matchmakingQueue.size < LOBBY_SIZE) {
    return;
  }

  // Sort players by MMR and take the first LOBBY_SIZE
  const players = Array.from(matchmakingQueue.entries())
    .sort((a, b) => a[1].mmr - b[1].mmr)
    .slice(0, LOBBY_SIZE);

  // Create a new match
  const matchId = uuidv4();
  const matchPlayers: Player[] = [];
  const sockets: Socket[] = [];

  for (const [socketId, { socket, player }] of players) {
    matchmakingQueue.delete(socketId);
    playerToMatch.set(socketId, matchId);
    matchPlayers.push(player);
    sockets.push(socket);

    // Join socket room for this match
    socket.join(matchId);
  }

  // Initialize match state
  const matchState: MatchState = {
    id: matchId,
    mode: 'versus',
    players: matchPlayers,
    currentTurn: 1,
    phase: 'shop',
    turnTimer: TURN_TIMER,
    battlePairings: [],
  };

  // Generate initial shops for all players
  const playerShops = matchPlayers.map(() => createShop(1));

  activeMatches.set(matchId, matchState);

  // Notify all players
  for (let i = 0; i < sockets.length; i++) {
    sockets[i].emit('versus:match_found', {
      matchId,
      playerId: matchPlayers[i].id,
      players: matchPlayers.map((p) => ({
        id: p.id,
        username: p.username,
        lives: p.lives,
        wins: p.wins,
      })),
      shop: playerShops[i],
      turnTimer: TURN_TIMER,
    });
  }

  // Start turn timer
  startTurnTimer(io, matchId);

  console.log(`Match ${matchId} created with ${LOBBY_SIZE} players`);
}

/**
 * Start the turn timer for a match
 */
function startTurnTimer(io: SocketIOServer, matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;

  const timerInterval = setInterval(() => {
    match.turnTimer--;

    if (match.turnTimer <= 0) {
      clearInterval(timerInterval);
      endTurnForAllPlayers(io, matchId);
    } else if (match.turnTimer % 10 === 0 || match.turnTimer <= 5) {
      // Broadcast timer update
      io.to(matchId).emit('versus:timer', { timeRemaining: match.turnTimer });
    }
  }, 1000);
}

/**
 * End turn for all players and resolve battles
 */
function endTurnForAllPlayers(io: SocketIOServer, matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.phase = 'battle';

  // Create battle pairings
  const alivePlayers = match.players.filter((p) => p.lives > 0);
  const pairings: [number, number][] = [];

  // Shuffle players for random pairings
  const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const p1Index = match.players.indexOf(shuffled[i]);
      const p2Index = match.players.indexOf(shuffled[i + 1]);
      pairings.push([p1Index, p2Index]);
    }
  }

  match.battlePairings = pairings.map(([i, j]) => [match.players[i].id, match.players[j].id]);

  // Resolve all battles
  const battleResults: {
    player1Id: string;
    player2Id: string;
    winnerId: string | null;
    events: any[];
  }[] = [];

  for (const [p1Id, p2Id] of match.battlePairings) {
    const p1 = match.players.find((p) => p.id === p1Id)!;
    const p2 = match.players.find((p) => p.id === p2Id)!;

    // Increment battles participated
    for (const pet of getActivePets(p1)) {
      incrementBattlesParticipated(pet);
    }
    for (const pet of getActivePets(p2)) {
      incrementBattlesParticipated(pet);
    }

    const result = resolveBattle(p1.team, p2.team);

    // Apply damage to loser
    if (result.winner === 'player') {
      const damage = calculateDamageTaken(result.playerTeamRemaining);
      p2.lives -= damage;
      p1.wins++;
    } else if (result.winner === 'opponent') {
      const damage = calculateDamageTaken(result.opponentTeamRemaining);
      p1.lives -= damage;
      p2.wins++;
    }

    // Reset battle stats
    for (const pet of p1.team) {
      if (pet) resetBattleStats(pet);
    }
    for (const pet of p2.team) {
      if (pet) resetBattleStats(pet);
    }

    battleResults.push({
      player1Id: p1Id,
      player2Id: p2Id,
      winnerId: result.winner === 'player' ? p1Id : result.winner === 'opponent' ? p2Id : null,
      events: result.events,
    });
  }

  // Broadcast battle results
  io.to(matchId).emit('versus:battle_results', {
    results: battleResults,
    players: match.players.map((p) => ({
      id: p.id,
      username: p.username,
      lives: p.lives,
      wins: p.wins,
    })),
  });

  // Check for game end
  const remainingPlayers = match.players.filter((p) => p.lives > 0);

  if (remainingPlayers.length <= 1) {
    // Game over
    const winner = remainingPlayers[0] || null;

    io.to(matchId).emit('versus:game_over', {
      winnerId: winner?.id,
      winnerName: winner?.username,
      finalStandings: match.players
        .map((p) => ({
          id: p.id,
          username: p.username,
          wins: p.wins,
          placement: 0,
        }))
        .sort((a, b) => b.wins - a.wins)
        .map((p, i) => ({ ...p, placement: i + 1 })),
    });

    // Clean up match
    for (const player of match.players) {
      const socketId = Array.from(playerToMatch.entries()).find(
        ([, mId]) => mId === matchId
      )?.[0];
      if (socketId) {
        playerToMatch.delete(socketId);
      }
    }
    activeMatches.delete(matchId);

    return;
  }

  // Start next turn
  match.currentTurn++;
  match.phase = 'shop';
  match.turnTimer = TURN_TIMER;

  // Generate new shops for all players
  for (const player of match.players) {
    if (player.lives > 0) {
      player.gold = 10;
      player.currentTurn = match.currentTurn;
    }
  }

  // Broadcast new turn
  setTimeout(() => {
    io.to(matchId).emit('versus:new_turn', {
      turn: match.currentTurn,
      turnTimer: TURN_TIMER,
      players: match.players.map((p) => ({
        id: p.id,
        username: p.username,
        lives: p.lives,
        wins: p.wins,
        eliminated: p.lives <= 0,
      })),
    });

    startTurnTimer(io, matchId);
  }, 3000); // 3 second delay to show battle results
}

/**
 * Handle shop buy in versus mode
 */
function handleVersusShopBuy(
  socket: Socket,
  data: { petIndex?: number; foodIndex?: number; targetPetId?: string }
): void {
  // Implementation would mirror the REST API but with WebSocket responses
  socket.emit('versus:shop_updated', { message: 'Shop action processed' });
}

/**
 * Handle shop roll in versus mode
 */
function handleVersusShopRoll(socket: Socket): void {
  socket.emit('versus:shop_updated', { message: 'Shop rolled' });
}

/**
 * Handle shop sell in versus mode
 */
function handleVersusShopSell(socket: Socket, data: { petId: string }): void {
  socket.emit('versus:shop_updated', { message: 'Pet sold' });
}

/**
 * Handle shop freeze in versus mode
 */
function handleVersusShopFreeze(socket: Socket, data: { slotIndex: number }): void {
  socket.emit('versus:shop_updated', { message: 'Slot frozen' });
}

/**
 * Handle team arrange in versus mode
 */
function handleVersusTeamArrange(socket: Socket, data: { newOrder: (string | null)[] }): void {
  socket.emit('versus:team_updated', { message: 'Team arranged' });
}

/**
 * Handle player ready in versus mode
 */
function handleVersusReady(socket: Socket): void {
  const matchId = playerToMatch.get(socket.id);
  if (!matchId) {
    socket.emit('error', { message: 'Not in a match' });
    return;
  }

  socket.emit('versus:ready_confirmed', { message: 'Waiting for other players' });
}

/**
 * Handle player disconnection
 */
function handleDisconnect(socket: Socket): void {
  console.log(`Client disconnected: ${socket.id}`);

  // Remove from matchmaking queue
  matchmakingQueue.delete(socket.id);

  // Handle match abandonment
  const matchId = playerToMatch.get(socket.id);
  if (matchId) {
    const match = activeMatches.get(matchId);
    if (match) {
      // Find and eliminate the disconnected player
      // In production, you might want to give them time to reconnect
      socket.to(matchId).emit('versus:player_left', {
        message: 'A player has disconnected',
      });
    }
    playerToMatch.delete(socket.id);
  }
}

export { activeMatches, matchmakingQueue };
