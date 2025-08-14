import { AIImageResponse, AICurveResponse, GameContext } from "@/app/types/exquisiteCorpse";

class GeminiAIService {
  async generateCurveTurn(context: GameContext): Promise<AICurveResponse> {
    try {
      const response = await fetch('/api/exquisite-corpse/draw-curve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: AICurveResponse = await response.json();
      return result;
    } catch (error) {
      console.error('AI curve turn generation failed:', error);
      throw new Error(`AI curve turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImageTurn(context: GameContext): Promise<AIImageResponse> {
    try {
      const response = await fetch('/api/exquisite-corpse/draw-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: AIImageResponse = await response.json();
      return result;
    } catch (error) {
      console.error('AI image turn generation failed:', error);
      throw new Error(`AI image turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
