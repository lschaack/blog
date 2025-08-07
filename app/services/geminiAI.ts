import { GoogleGenerativeAI } from "@google/generative-ai";

export type Point = [number, number];

export type AITurnResponse = {
  interpretation: string;
  line: Point[];
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
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private buildPrompt(context: GameContext): string {
    const historyText = context.history
      .map(turn => {
        if (turn.author === "user") {
          return `Turn ${turn.turn}: User drew a line`;
        } else {
          return `Turn ${turn.turn}: AI saw "${turn.interpretation}" and ${turn.reasoning}`;
        }
      })
      .join("\n");

    return `You're playing a collaborative drawing game called "Exquisite Corpse."

RULES:
1. First, describe what you think the drawing is becoming
2. Add exactly ONE continuous line to continue the drawing
3. Keep additions simple and playful - just a single stroke
4. Build on what's there rather than starting something completely new
5. Your line should be 3-15 coordinate points forming one continuous stroke

CANVAS INFO:
- Dimensions: ${context.canvasDimensions.width}x${context.canvasDimensions.height} pixels
- Coordinates: (0,0) is top-left, (${context.canvasDimensions.width},${context.canvasDimensions.height}) is bottom-right
- Draw within these bounds

GAME HISTORY:
${historyText || "This is the first turn of the game."}

CURRENT TURN: ${context.currentTurn}

Look at the current drawing and:
1. Interpret what you think it's becoming
2. Add one simple, continuous line that builds on the existing drawing
3. Explain your reasoning

Respond with a JSON object in this exact format:
{
  "interpretation": "Your interpretation of what the drawing represents",
  "line": [[x1, y1], [x2, y2], [x3, y3], ...],
  "reasoning": "Brief explanation of why you added this line"
}

The line array should contain 3-15 coordinate points forming one continuous stroke.`;
  }

  private validateResponse(response: unknown): AITurnResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid AI response format');
    }

    const { interpretation, line, reasoning } = response;

    if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
      throw new Error('Invalid or missing interpretation');
    }

    if (!Array.isArray(line) || line.length < 3 || line.length > 15) {
      throw new Error('Line must be an array of 3-15 coordinate points');
    }

    if (typeof reasoning !== 'string' || reasoning.trim().length === 0) {
      throw new Error('Invalid or missing reasoning');
    }

    // Validate each coordinate point
    for (const point of line) {
      if (!Array.isArray(point) || point.length !== 2) {
        throw new Error('Each point must be a [x, y] coordinate array');
      }
      const [x, y] = point;
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('Coordinates must be finite numbers');
      }
    }

    return {
      interpretation: interpretation.trim(),
      line: line as Point[],
      reasoning: reasoning.trim(),
    };
  }

  private validateCoordinateBounds(
    line: Point[], 
    bounds: { width: number; height: number }
  ): Point[] {
    return line.map(([x, y]) => [
      Math.max(0, Math.min(bounds.width, Math.round(x))),
      Math.max(0, Math.min(bounds.height, Math.round(y)))
    ]) as Point[];
  }

  async generateTurn(context: GameContext): Promise<AITurnResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = this.buildPrompt(context);
      
      // Convert base64 image to proper format for Gemini
      const imageData = context.image.replace('data:image/png;base64,', '');
      
      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: "image/png"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      let parsedResponse;
      try {
        // Extract JSON from response text (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        parsedResponse = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
      }

      // Validate the response structure
      const validatedResponse = this.validateResponse(parsedResponse);

      // Validate and clamp coordinates to canvas bounds
      const boundedLine = this.validateCoordinateBounds(
        validatedResponse.line, 
        context.canvasDimensions
      );

      return {
        ...validatedResponse,
        line: boundedLine,
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`AI turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
let geminiService: GeminiAIService | null = null;

export const getGeminiService = (): GeminiAIService => {
  if (!geminiService) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is required');
    }
    geminiService = new GeminiAIService(apiKey);
  }
  return geminiService;
};

export default GeminiAIService;