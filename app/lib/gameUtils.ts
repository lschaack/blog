import type { MultiplayerGameState } from '@/app/types/multiplayer';

export function* playerOrder(gameState: MultiplayerGameState) {
  const lastPlayerName = gameState.turns.at(-1)?.author;
  // NOTE: This must be sorted, but that should be automatic since players are
  // appended at join time and removed when they disconnect for any reason
  const eligiblePlayers = Object.values(gameState.players)
  const lastPlayerIndex = eligiblePlayers.findIndex(player => player.name === lastPlayerName);
  const lastPlayerInGame = lastPlayerIndex !== -1;
  const startIndex = lastPlayerIndex + 1; // 0 if lastPlayer is not in eligiblePlayers
  // wrap around eligible players without hitting lastPlayer
  const endIndex = Math.max(
    startIndex,
    startIndex + eligiblePlayers.length - Number(lastPlayerInGame)
  );

  for (let i = startIndex; i < endIndex; i++) {
    const player = eligiblePlayers[i % eligiblePlayers.length];

    if (gameState.type === 'singleplayer' && player.name === 'AI' && gameState.turns.length === 0) {
      continue;
    } else {
      yield player;
    }
  }
}

export function getCurrentPlayer(gameState: MultiplayerGameState) {
  const currentPlayer = playerOrder(gameState);

  if (!currentPlayer) {
    console.error('Failed to find current player for game state:', gameState);
  }

  return currentPlayer ?? null;
}
