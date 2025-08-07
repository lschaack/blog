import { GoogleGenerativeAI } from "@google/generative-ai";

export type Point = [number, number];
export type BezierCurve = [Point, Point, Point, Point]; // [startPoint, controlPoint1, controlPoint2, endPoint]

export type AITurnResponse = {
  interpretation: string;
  curves: BezierCurve[];  // Direct Bezier curve output
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

DRAWING RULES:
1. First, describe what you think the drawing is becoming
2. Add exactly ONE flowing, artistic line that connects meaningfully to existing shapes
3. Think like an artist - create curves that have natural flow and expression
4. Build on what's there rather than starting something completely new
5. Your addition should enhance and develop the existing drawing

CANVAS INFO:
- Dimensions: ${context.canvasDimensions.width}x${context.canvasDimensions.height} pixels
- Coordinates: (0,0) is top-left, (${context.canvasDimensions.width},${context.canvasDimensions.height}) is bottom-right
- Draw within these bounds

BEZIER CURVE DRAWING:
You will draw using Bezier curves, which create smooth, artistic lines. Each curve has 4 points:
- Start Point: Where the curve begins
- Control Point 1: Pulls the curve from the start (creates the initial direction/bend)
- Control Point 2: Pulls the curve toward the end (creates the final direction/bend)  
- End Point: Where the curve ends

ARTISTIC TECHNIQUE TIPS:
- To create a smooth flowing line: Place control points along the general direction of flow
- To create tight curves: Pull control points closer to start/end points
- To create gentle curves: Place control points further from start/end points
- To connect to existing shapes: Start your curve near or touching existing elements
- To create natural flow: Think about how a pencil would naturally move

EXAMPLES OF GOOD CURVES:
- Gentle arc: [[50,100], [75,80], [125,80], [150,100]] (control points above the arc)
- S-curve: [[100,50], [120,30], [130,70], [150,50]] (control points create flowing S shape)
- Connecting line: [[10,20], [30,15], [70,45], [90,50]] (flows from one shape to another)

GAME HISTORY:
${historyText || "This is the first turn of the game."}

CURRENT TURN: ${context.currentTurn}

TASK:
1. Analyze the image carefully - look for shapes, lines, and potential connections
2. Interpret what the drawing is becoming (be creative but grounded in what you see)
3. Plan ONE artistic curve that will enhance the drawing
4. Consider how your curve connects to or builds upon existing elements
5. Choose start/end points that make visual sense
6. Design control points that create beautiful, flowing curves

Respond with a JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "curves": [
    [[startX, startY], [control1X, control1Y], [control2X, control2Y], [endX, endY]]
  ],
  "reasoning": "Why you chose to add this specific curve and how it enhances the drawing"
}

IMPORTANT: 
- Use exactly 1-3 Bezier curves to create one flowing artistic line
- Make sure your curves connect meaningfully to existing shapes
- Think about the artistic flow and natural movement
- Consider the overall composition and balance`;
  }

  private validateResponse(response: unknown): AITurnResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid AI response format');
    }

    const { interpretation, curves, reasoning } = response as { interpretation: unknown; curves: unknown; reasoning: unknown };

    if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
      throw new Error('Invalid or missing interpretation');
    }

    if (!Array.isArray(curves) || curves.length < 1 || curves.length > 3) {
      throw new Error('Must provide 1-3 Bezier curves');
    }

    if (typeof reasoning !== 'string' || reasoning.trim().length === 0) {
      throw new Error('Invalid or missing reasoning');
    }

    // Validate each Bezier curve
    for (const curve of curves) {
      if (!Array.isArray(curve) || curve.length !== 4) {
        throw new Error('Each curve must have exactly 4 points: [start, control1, control2, end]');
      }
      
      // Validate each point in the curve
      for (const point of curve) {
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
    }

    return {
      interpretation: interpretation.trim(),
      curves: curves as BezierCurve[],
      reasoning: reasoning.trim(),
    };
  }

  private validateCurveBounds(
    curves: BezierCurve[], 
    bounds: { width: number; height: number }
  ): BezierCurve[] {
    return curves.map(curve => {
      return curve.map(([x, y]) => [
        Math.max(0, Math.min(bounds.width, Math.round(x))),
        Math.max(0, Math.min(bounds.height, Math.round(y)))
      ]) as Point;
    }) as BezierCurve[];
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
      const boundedCurves = this.validateCurveBounds(
        validatedResponse.curves, 
        context.canvasDimensions
      );

      return {
        ...validatedResponse,
        curves: boundedCurves,
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