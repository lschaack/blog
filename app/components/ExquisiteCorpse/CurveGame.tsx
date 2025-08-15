import { CanvasDimensions, CurveTurn, GameContext } from '@/app/types/exquisiteCorpse';
import { CurveTurnRenderer } from './CurveTurnRenderer';
import { renderLinesToBase64, checkImageSizeLimit } from "./imageContext";
import { getGeminiService } from "./geminiAI";
import { Game, GameProps } from "./Game";

const getAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
): Promise<CurveTurn> => {
  // Step 1: Render current game state to image
  const base64Image = await renderLinesToBase64(
    history.map(turn => turn.path),
    dimensions.width,
    dimensions.height
  );

  // Step 2: Validate image size
  if (!checkImageSizeLimit(base64Image)) {
    throw new Error("Generated image is too large for AI processing");
  }

  // Step 3: Create game context
  const gameContext: GameContext<CurveTurn> = {
    image: base64Image,
    canvasDimensions: dimensions,
    currentTurn: history.length + 1,
    history: history
  };

  // Step 4: Call AI service
  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateCurveTurn(gameContext);

  // Return the turn data (without metadata fields that will be added by reducer)
  return aiResponse as CurveTurn;
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
