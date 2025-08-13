"use client";

import { BaseTurn } from "@/app/types/exquisiteCorpse";

type TurnInfoProps<Turn extends BaseTurn> = {
  turn: Turn;
};

export const TurnInfo = <Turn extends BaseTurn>({ turn }: TurnInfoProps<Turn>) => {
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
