"use client";

import { MultiplayerGameState } from '@/app/types/multiplayer';
import { TurnManager } from '../../TurnManager';
import { CurveTurn } from '@/app/types/exquisiteCorpse';
import { CoiveToinRendera } from '../../CurveTurnRenderer';
import { CurveTurnMetaRenderer } from '../../CurveTurnMetaRenderer';

type GameViewProps = {
  gameData: MultiplayerGameState;
}
export function GameView({ gameData }: GameViewProps) {
  return (
    <TurnManager<CurveTurn>
      handleAddPath={() => undefined}
      dimensions={gameData.dimensions}
      turns={gameData.turns}
      TurnRenderer={CoiveToinRendera}
      TurnMetaRenderer={CurveTurnMetaRenderer}
      readOnly
    />
  );
}
