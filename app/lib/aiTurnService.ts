import type { CurveTurn, GameContext, CanvasDimensions } from '@/app/types/exquisiteCorpse';

// Server-side AI turn generation using direct service calls
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

  console.log('sending game context', gameContext)

  // Step 4: Call AI service directly
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  // Try GPT-5 first if OpenAI key is available, otherwise fall back to Gemini
  if (process.env.OPENAI_API_KEY) {
    const { GPT5CurveDrawingService } = await import('@/app/api/exquisite-corpse/draw-curve/gpt5-curve-drawing-service');
    const gpt5Service = new GPT5CurveDrawingService(process.env.OPENAI_API_KEY);
    return await gpt5Service.generateTurn(gameContext);
  } else if (process.env.GEMINI_API_KEY) {
    const { CurveDrawingService } = await import('@/app/api/exquisite-corpse/draw-curve/curve-drawing-service');
    const geminiService = new CurveDrawingService(process.env.GEMINI_API_KEY);
    return await geminiService.generateTurn(gameContext);
  } else {
    throw new Error('No AI service available');
  }
};
