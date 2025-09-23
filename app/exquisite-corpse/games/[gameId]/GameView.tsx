"use client";

import { MultiplayerCurveTurnRenderer } from '../../MultiplayerCurveTurnRenderer';
import { MultiplayerGameState } from '@/app/types/multiplayer';

type GameViewProps = {
  gameData: MultiplayerGameState;
}
export function GameView({ gameData }: GameViewProps) {
  return (
    <MultiplayerCurveTurnRenderer
      handleEndTurn={() => undefined}
      canvasDimensions={gameData.dimensions}
      turns={gameData.turns}
      readOnly
    />
  );
}
