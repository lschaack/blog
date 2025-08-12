export type Point = [number, number];
export type BezierCurve = [Point, Point, Point, Point]; // [startPoint, controlPoint1, controlPoint2, endPoint]

export type AITurnResponse = {
  interpretation: string;
  curves: BezierCurve[];  // Direct Bezier curve output
  reasoning: string;
};

export type AIImageResponse = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
  reasoning: string;
};

export type GameContext = {
  image: string; // base64 encoded PNG
  canvasDimensions: { width: number; height: number };
  currentTurn: number;
  history: {
    turn: number;
    author: "user" | "ai";
    interpretation?: string;
    reasoning?: string;
  }[];
};

class GeminiAIService {
  async generateCurveTurn(context: GameContext): Promise<AITurnResponse> {
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

      const result: AITurnResponse = await response.json();
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