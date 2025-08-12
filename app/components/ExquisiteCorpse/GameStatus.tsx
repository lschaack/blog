"use client";

import { useGameContext } from "./GameContext";
import { BaseTurn } from "./types";
import { isUserTurn, isAITurn, isViewingCurrentTurn } from "./gameReducer";

type GameStatusProps = {
  aiProcessing?: boolean;
  aiError?: string;
  aiProgress?: string;
};

export const GameStatus = <T extends BaseTurn>({
  aiProcessing,
  aiError,
  aiProgress
}: GameStatusProps) => {
  const gameState = useGameContext<T>();

  const renderStatus = () => {
    // AI processing state
    if (aiProcessing) {
      return (
        <div>
          <div className="font-semibold">AI is drawing...</div>
          {aiProgress && <div className="text-sm text-gray-600">{aiProgress}</div>}
        </div>
      );
    }

    // AI error state
    if (aiError) {
      return (
        <div>
          <div className="font-semibold text-red-600">AI Turn Failed</div>
          <div className="text-sm text-red-500">{aiError}</div>
        </div>
      );
    }

    // Not viewing current turn
    if (!isViewingCurrentTurn(gameState)) {
      return (
        <div className="font-semibold text-gray-600">
          Viewing Turn {gameState.currentTurnIndex + 1}
        </div>
      );
    }

    // User's turn
    if (isUserTurn(gameState)) {
      return <div className="font-semibold text-blue-600">Your Turn</div>;
    }

    // AI's turn
    if (isAITurn(gameState)) {
      return <div className="font-semibold text-purple-600">AI&apos;s Turn</div>;
    }

    // Game start
    return <div className="font-semibold">Start Drawing!</div>;
  };

  return (
    <div className="text-center p-2 bg-gray-100 rounded">
      {renderStatus()}
    </div>
  );
};
