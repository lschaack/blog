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

DRAWING PHILOSOPHY:
Once you interpret what the drawing is becoming, LEAN INTO that interpretation! Make bold, expressive additions that fully capture your artistic vision. Don't hold back with tiny additions - create substantial, meaningful elements that bring your interpretation to life.

DRAWING RULES:
1. First, describe what you think the drawing is becoming
2. Add one cohesive artistic element that FULLY EXPRESSES your interpretation
3. Think like a confident artist - create curves that make a strong visual statement
4. Build on what's there and EXPAND it with your creative vision
5. Your addition should be substantial enough to clearly advance the drawing toward your interpretation

SCALE AND IMPACT GUIDELINES:
- If you see a volcano, don't just add a tiny puff - create a bold plume of smoke with multiple flowing curves
- If you see a face, don't just hint at features - draw a complete eye, mouth, or distinctive facial element
- If you see an animal, add a defining characteristic like a full tail, ear, or distinctive body part
- If you see a landscape, add a substantial element like rolling hills, flowing water, or dramatic sky
- Make your addition VISIBLE and MEANINGFUL - aim to use 20-40% of the remaining canvas space when appropriate

CANVAS INFO:
- Dimensions: ${context.canvasDimensions.width}x${context.canvasDimensions.height} pixels
- Coordinates: (0,0) is top-left, (${context.canvasDimensions.width},${context.canvasDimensions.height}) is bottom-right
- Draw within these bounds - use the space boldly!

BEZIER CURVE DRAWING:
You will draw using Bezier curves, which create smooth, artistic lines. Each curve has 4 points:
- Start Point: Where the curve begins
- Control Point 1: Pulls the curve from the start (creates the initial direction/bend)
- Control Point 2: Pulls the curve toward the end (creates the final direction/bend)  
- End Point: Where the curve ends

CREATING SUBSTANTIAL ADDITIONS:
- Use as many curves as needed to create your artistic element properly
- Create overlapping elements (like loops for smoke, waves for water, petals for flowers)
- Think about the full form of what you're drawing, not just a single stroke
- Connect curves to create flowing, continuous forms that span meaningful distances

ARTISTIC TECHNIQUE TIPS:
- To create flowing sequences: Chain curves together with smooth transitions
- To create volume and substance: Use curves that loop, spiral, or expand outward
- To create natural elements: Think about how smoke billows, water flows, hair curls, leaves grow
- To connect meaningfully: Start from existing elements but extend confidently into new space

EXAMPLES OF SUBSTANTIAL ADDITIONS:
- Volcano smoke (7 curves): Multiple looping curves expanding upward: [[100,50], [80,30], [120,10], [140,20]], [[140,20], [160,5], [180,25], [200,30]], [[200,30], [220,15], [240,35], [250,40]], [[180,25], [160,15], [140,25], [160,35]], [[240,35], [260,20], [280,40], [300,45]], [[160,35], [180,25], [200,35], [220,40]], [[220,40], [240,25], [260,45], [280,50]]
- Flowing hair (5 curves): Cascading curves: [[150,100], [170,80], [190,120], [210,110]], [[210,110], [230,90], [250,130], [270,120]], [[190,120], [210,140], [230,160], [250,150]], [[250,130], [270,150], [290,170], [310,160]], [[270,120], [290,140], [310,160], [330,150]]
- Rolling hills (4 curves): Undulating landscape: [[0,200], [50,180], [100,190], [150,185]], [[150,185], [200,175], [250,185], [300,180]], [[300,180], [350,170], [400,180], [450,175]], [[450,175], [480,165], [500,175], [512,170]]

GAME HISTORY:
${historyText || "This is the first turn of the game."}

CURRENT TURN: ${context.currentTurn}

TASK:
1. Analyze the image carefully - look for shapes, lines, and potential connections
2. Interpret what the drawing is becoming (be creative and confident!)
3. Plan a SUBSTANTIAL artistic addition using as many curves as needed to fully express your interpretation
4. Don't be timid - make an addition that clearly advances the drawing toward your vision
5. Use curves that span meaningful distances and create recognizable elements
6. Think about the complete form you want to make, then design curves to achieve it

Respond with a JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "curves": [
    [[startX, startY], [control1X, control1Y], [control2X, control2Y], [endX, endY]]
  ],
  "reasoning": "Why you chose to add this specific substantial element and how it brings your interpretation to life"
}

IMPORTANT: 
- Use as many Bezier curves as needed to create your artistic element properly
- Make your addition BOLD and VISIBLE - don't be shy!
- Fully express your interpretation through your curves
- Think about the complete form, not just a single line segment
- Create elements that other players can clearly see and build upon`;
  }

  private validateResponse(response: unknown): AITurnResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid AI response format');
    }

    const { interpretation, curves, reasoning } = response as { interpretation: unknown; curves: unknown; reasoning: unknown };

    if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
      throw new Error('Invalid or missing interpretation');
    }

    if (!Array.isArray(curves) || curves.length < 1 || curves.length > 15) {
      throw new Error('Must provide 1-15 Bezier curves');
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
      ] as Point) as BezierCurve;
    });
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