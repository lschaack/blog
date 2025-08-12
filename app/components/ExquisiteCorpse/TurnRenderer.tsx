"use client";

import { BaseTurn } from "./types";

type TurnRendererProps<Turn extends BaseTurn> = {
  turn: Turn;
};

export const TurnRenderer = <Turn extends BaseTurn>({ turn }: TurnRendererProps<Turn>) => {
  return (
    <div className="space-y-2">
      <div className="font-medium">
        Turn {turn.number} - {turn.author === "user" ? "You" : "AI"}
      </div>
      {turn.interpretation && (
        <div className="text-gray-600 italic">
          &ldquo;{turn.interpretation}&rdquo;
        </div>
      )}
      {turn.reasoning && (
        <div className="text-gray-500 text-xs">
          {turn.reasoning}
        </div>
      )}
    </div>
  );
};
