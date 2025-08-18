import type { CurveTurn, GameContext, CanvasDimensions } from '@/app/types/exquisiteCorpse';
import { getGeminiService } from '@/app/components/ExquisiteCorpse/geminiAI';

// Server-side AI turn generation (extracted from CurveGame.tsx)
export const generateAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
) => {
  // Import server-side rendering function
  const { renderLinesToBase64Server, checkImageSizeLimit } = await import('./serverImageUtils');

  // Step 1: Render current game state to image
  const base64Image = await renderLinesToBase64Server(
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
  return aiResponse;
};