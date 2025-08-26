import type { MultiplayerGameState } from '@/app/types/multiplayer';

export function getCurrentPlayer(gameState: MultiplayerGameState) {
  const lastPlayerId = gameState.turns.at(-1)?.author;
  const eligiblePlayers = gameState.players
    .filter(player => player.isActive && player.id !== lastPlayerId)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

  return eligiblePlayers[0];
}

/**
 * Check if a specific player is currently the active player
 */
export function isCurrentPlayer(gameState: MultiplayerGameState, playerId: string): boolean {
  return getCurrentPlayer(gameState)?.id === playerId;
}
