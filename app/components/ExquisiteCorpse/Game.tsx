import { useCallback, useEffect } from "react";

import { BaseTurn, CurveTurn } from './types';
import { GameProvider, useGameContext } from './GameContext';
import { GameStatus } from './GameStatus';
import { CurrentTurn } from './CurrentTurn';
import { TurnHistory } from './TurnHistory';
import { ExportUtilities } from './ExportUtilities';
import { StateEditor } from './StateEditor';
import { TurnRenderer } from './TurnRenderer';
import { useAITurn } from './useAITurn';
import { getDisplayTurns, isAITurn, isViewingCurrentTurn } from './gameReducer';
import { renderGameStateToBase64, createGameContextSummary, checkImageSizeLimit } from "./imageContext";
import { getGeminiService, GameContext } from "./geminiAI";
import { processAIBezierCurves } from "./lineConversion";

type CanvasDimensions = { width: number; height: number };

type GameProps<Turn extends BaseTurn> = {
  getAITurn: (history: Turn[]) => Promise<Turn>;
  dimensions: CanvasDimensions;
};

const getAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
): Promise<CurveTurn> => {
  // Step 1: Render current game state to image
  const base64Image = await renderGameStateToBase64(
    history.map(turn => turn.line),
    dimensions.width,
    dimensions.height
  );

  // Step 2: Validate image size
  if (!checkImageSizeLimit(base64Image)) {
    throw new Error("Generated image is too large for AI processing");
  }

  // Step 3: Create game context
  const gameContext: GameContext = {
    image: base64Image,
    canvasDimensions: dimensions,
    currentTurn: history.length + 1,
    history: createGameContextSummary(history)
  };

  // Step 4: Call AI service
  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateTurn(gameContext);

  // Step 5: Convert AI Bezier curves to our line format
  const convertedLine = processAIBezierCurves(aiResponse.curves);

  // Return the turn data (without metadata fields that will be added by reducer)
  return {
    line: convertedLine,
    interpretation: aiResponse.interpretation,
    reasoning: aiResponse.reasoning
  } as CurveTurn;
}

// Internal game component that uses the context
const GameInternal = <Turn extends BaseTurn>({ getAITurn, dimensions }: GameProps<Turn>) => {
  const gameState = useGameContext<Turn>();
  const aiTurn = useAITurn<Turn>(getAITurn);

  // Auto-trigger AI turn when user completes their turn
  useEffect(() => {
    const processAITurnAutomatically = async () => {
      // Only process AI turn if:
      // 1. It's AI's turn (user just finished)
      // 2. AI is not already processing
      // 3. We're viewing the current turn
      if (isAITurn(gameState) && !aiTurn.isProcessing && isViewingCurrentTurn(gameState)) {
        try {
          const displayTurns = getDisplayTurns(gameState);
          const { author, number, timestamp, ...payload } = await aiTurn.processAITurn(displayTurns);

          // Dispatch AI turn
          gameState.dispatch({
            type: "end_ai_turn",
            payload,
          });
        } catch (error) {
          console.error("AI turn failed:", error);
        }
      }
    };

    processAITurnAutomatically();
  }, [gameState, aiTurn]);

  // Handle user turn completion
  const handleEndTurn = useCallback((turnData: Omit<Turn, "author" | "timestamp" | "number">) => {
    gameState.dispatch({
      type: "end_user_turn",
      payload: turnData
    });
  }, [gameState]);

  return (
    <div className="flex flex-col gap-4 max-w-[512px]">
      <GameStatus
        aiProcessing={aiTurn.isProcessing}
        aiError={aiTurn.hasError ? aiTurn.getErrorMessage(aiTurn.error!) : undefined}
        aiProgress={aiTurn.progress}
      />

      <CurrentTurn
        handleEndTurn={handleEndTurn}
        renderTurn={TurnRenderer}
        readOnly={aiTurn.isProcessing}
        canvasDimensions={dimensions}
      />

      <TurnHistory />

      <ExportUtilities canvasDimensions={dimensions} />

      <StateEditor />
    </div>
  );
};

const Game = <Turn extends BaseTurn>({ getAITurn, dimensions }: GameProps<Turn>) => {
  return (
    <GameProvider<Turn>>
      <GameInternal getAITurn={getAITurn} dimensions={dimensions} />
    </GameProvider>
  );
};

export const CurveGame = ({ dimensions }: Pick<GameProps<CurveTurn>, 'dimensions'>) => {
  return (
    <Game<CurveTurn>
      dimensions={dimensions}
      getAITurn={history => getAICurveTurn(history, dimensions)}
    />
  )
}
