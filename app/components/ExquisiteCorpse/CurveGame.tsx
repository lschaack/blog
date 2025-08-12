import { CanvasDimensions, CurveTurn } from './types';
import { CurveTurnRenderer } from './CurrentTurn';
import { renderGameStateToBase64, createGameContextSummary, checkImageSizeLimit } from "./imageContext";
import { getGeminiService, GameContext } from "./geminiAI";
import { processAIBezierCurves } from "./lineConversion";
import { Game, GameProps } from "./Game";

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
  const aiResponse = await geminiService.generateCurveTurn(gameContext);

  // Step 5: Convert AI Bezier curves to our line format
  const convertedLine = processAIBezierCurves(aiResponse.curves);

  // Return the turn data (without metadata fields that will be added by reducer)
  return {
    line: convertedLine,
    interpretation: aiResponse.interpretation,
    reasoning: aiResponse.reasoning
  } as CurveTurn;
}

export const CurveGame = ({ dimensions }: Pick<GameProps<CurveTurn>, 'dimensions'>) => {
  return (
    <Game<CurveTurn>
      CurrentTurn={CurveTurnRenderer}
      dimensions={dimensions}
      getAITurn={history => getAICurveTurn(history, dimensions)}
    />
  )
}
