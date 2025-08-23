import type { MultiplayerGameState } from '@/app/types/multiplayer';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';

/**
 * Pure function to determine the current player based on game state.
 * 
 * Rules:
 * 1. If game is type 'ai' and the last player was not 'ai', current player is 'ai'
 * 2. Otherwise, current player is the least-recently-joined connected player who did not take the last turn
 */
export function getCurrentPlayer(gameState: MultiplayerGameState): string | null {
  const connectedPlayers = gameState.players.filter(p => p.connectionStatus === 'connected');

  if (connectedPlayers.length === 0) {
    return null;
  }

  // If no turns have been played, first player is the least recently joined connected player
  if (gameState.turns.length === 0) {
    const sortedPlayers = connectedPlayers.sort((a, b) =>
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
    return sortedPlayers[0]?.id || null;
  }

  const lastTurn = gameState.turns[gameState.turns.length - 1];
  const lastPlayerId = getPlayerIdFromTurn(lastTurn, gameState);

  // Rule 1: If game is AI type and last player was not AI, current player is AI
  if (gameState.type === 'ai' && lastPlayerId !== 'ai') {
    const aiPlayer = connectedPlayers.find(p => p.id === 'ai');
    if (aiPlayer) {
      return 'ai';
    }
  }

  // Rule 2: Current player is the least-recently-joined connected player who did not take the last turn
  const eligiblePlayers = connectedPlayers
    .filter(p => p.id !== lastPlayerId)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());


  return eligiblePlayers[0]?.id || null;
}

/**
 * Helper function to extract player ID from a turn
 * For AI turns, return 'ai'
 * For user turns, we need to determine which user took the turn based on game context
 */
function getPlayerIdFromTurn(turn: CurveTurn, gameState: MultiplayerGameState): string {
  if (turn.author === 'ai') {
    return 'ai';
  }

  // For user turns, find the human player who would have been current at that turn number
  // This is a simplified approach - in a real system you might store player ID in the turn
  const humanPlayers = gameState.players.filter(p => p.connectionStatus === 'connected' && p.id !== 'ai');
  if (humanPlayers.length === 0) return 'unknown';

  // For now, cycle through human players based on turn number
  const turnIndex = turn.number ? turn.number - 1 : gameState.turns.findIndex(t => t === turn);
  const humanTurnIndex = Math.floor(turnIndex / (gameState.type === 'ai' ? 2 : 1));
  const playerIndex = humanTurnIndex % humanPlayers.length;

  return humanPlayers[playerIndex]?.id || humanPlayers[0].id;
}

/**
 * Get the next player in turn order, used for event data
 */
export function getNextPlayer(gameState: MultiplayerGameState): string | null {
  // After a turn is submitted, recalculate based on the new state
  return getCurrentPlayer(gameState);
}

/**
 * Check if a specific player is currently the active player
 */
export function isCurrentPlayer(gameState: MultiplayerGameState, playerId: string): boolean {
  const currentPlayer = getCurrentPlayer(gameState);
  return currentPlayer === playerId;
}
