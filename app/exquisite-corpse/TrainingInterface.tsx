"use client";

import { useState } from "react";

import { BaseTurn, Path } from "@/app/types/exquisiteCorpse";
import { TurnManager } from "./TurnManager";
import { CurveTurnRenderer } from "./CurveTurnRenderer";

const dimensions = { width: 512, height: 512 };

export type TrainingTurn = BaseTurn & { path: Path };

export const TrainingInterface = () => {
  const [turns, setTurns] = useState<TrainingTurn[]>([]);

  return (
    <TurnManager
      handleAddPath={path => setTurns(prev => [
        ...prev,
        {
          path,
          author: 'training',
          timestamp: new Date().toISOString(),
        }
      ])}
      dimensions={dimensions}
      turns={turns}
      TurnRenderer={CurveTurnRenderer}
    />
  );
};

