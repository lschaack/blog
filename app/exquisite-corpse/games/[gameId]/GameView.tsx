"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MultiplayerGameState } from '@/app/types/multiplayer';
import { TurnManager } from '../../TurnManager';
import { CurveTurn } from '@/app/types/exquisiteCorpse';
import { CurveTurnRenderer } from '../../CurveTurnRenderer';
import { CurveTurnMetaRenderer } from '../../CurveTurnMetaRenderer';

type GameViewProps = {
  gameData: MultiplayerGameState;
}
export function GameView({ gameData }: GameViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/exquisite-corpse/examples" className="classic-link">
        <ArrowLeft size={16} className="inline align-text-bottom mr-1" />
        Back to list
      </Link>
      <TurnManager<CurveTurn>
        handleAddPath={() => undefined}
        dimensions={gameData.dimensions}
        turns={gameData.turns}
        TurnRenderer={CurveTurnRenderer}
        TurnMetaRenderer={CurveTurnMetaRenderer}
        readOnly
      />
    </div>
  );
}
