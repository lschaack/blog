import { AIImageResponseGeminiFlashPreview, AICurveResponse, GameContext } from "@/app/types/exquisiteCorpse";

class GeminiAIService {
  async extractJson(request: Promise<Response>) {
    try {
      const response = await request;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI curve turn generation failed:', error);
      throw new Error(`AI curve turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCurveTurn(context: GameContext): Promise<AICurveResponse> {
    return this.extractJson(fetch('/api/exquisite-corpse/draw-curve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    }));
  }

  async generateImageTurn(context: GameContext): Promise<AIImageResponseGeminiFlashPreview> {
    return this.extractJson(fetch('/api/exquisite-corpse/draw-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    }));
  }
}

// Singleton instance
let geminiService: GeminiAIService | null = null;

export const getGeminiService = (): GeminiAIService => {
  if (!geminiService) {
    geminiService = new GeminiAIService();
  }
  return geminiService;
};

export default GeminiAIService;
