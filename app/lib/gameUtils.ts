import type { MultiplayerGameState } from '@/app/types/multiplayer';

export function getCurrentPlayer(gameState: MultiplayerGameState) {
  const lastPlayerName = gameState.turns.at(-1)?.author;
  const eligiblePlayers = Object.values(gameState.players)
    .filter(player => player.isActive && player.name !== lastPlayerName)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

  return eligiblePlayers[0];
}

/**
 * Check if a specific player is currently the active player
 */
export function isCurrentPlayer(gameState: MultiplayerGameState, playerName: string): boolean {
  return getCurrentPlayer(gameState)?.name === playerName;
}
