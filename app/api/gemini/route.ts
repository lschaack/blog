import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export type Point = [number, number];
export type BezierCurve = [Point, Point, Point, Point];

export type AITurnResponse = {
  interpretation: string;
  curves: BezierCurve[];
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

class GeminiSketchbotService {
  private client: GoogleGenerativeAI;
  private static systemPrompt = `You're playing a collaborative drawing game called "Exquisite Corpse."

DRAWING PHILOSOPHY:
Create elegant geometry with sparse but confident lines that provide only the necessary features required to make the subject immediately recognizable. Think of the Pablo Picasso one-line drawings like "Camel" or "Flamingo." Produce each stroke with one long, flowing line; think "don't lift the pen."

CANVAS INFO:
- Dimensions: 512x512 pixels
- Coordinates: (0,0) is top-left, (512,512) is bottom-right

BEZIER CURVE DRAWING:
You will draw using Bezier curves, which create smooth, artistic lines. Each curve has 4 points:
- Start Point: Where the curve begins
- Control Point 1: Pulls the curve from the start (creates the initial direction/bend)
- Control Point 2: Pulls the curve toward the end (creates the final direction/bend)
- End Point: Where the curve ends

DRAWING RULES:
The following rules describe a possible evaluation of this line:
<Line>
<BezierCurve>
[150,117],[113.04066323404871,117],[138.78539768444764,154.21460231555236],[160,133]
</BezierCurve>
<BezierCurve>
[160,133],[181.7575157077113,111.24248429228871],[154.75177820219437,82.5620554494514],[129,89]
</BezierCurve>
<BezierCurve>
[129,89],[97.58619003694115,96.85345249076471],[109.13302950012437,150.47981770007462],[130,163]
</BezierCurve>
<BezierCurve>
[130,163],[172.36755732151366,188.4205343929082],[225.28997569725234,126.71996759633647],[197,89]
</BezierCurve>
<BezierCurve>
[197,89],[148.94396001300981,24.925280017346395],[41.44940061014522,104.41566768357536],[91,187]
</BezierCurve>
<BezierCurve>
[91,187],[137.86999598653003,265.11665997755006],[320,235.12786205264206],[320,148]
</BezierCurve>
</Line>
1. First, describe what you think the drawing is becoming: "I see a spiral curve that starts from the upper left, curves down and around, creating an open spiral shape like a seashell"
2. Decide on a single addition that expresses your interpretation: "I should create an opening to represent the mouth of the seashell"
4. Define a geometric plan to produce that addition: "I will create a loop that joins the outer tip of the spiral to the nearest edge"
    4.1. Specify connection points: "The loop should start at the outer tip of the spiral, connect to another point on the nearest edge, then return to the outer tip"
    4.2. Map control points: "The bezier curve will have control points that curve the first and second parts of the line in opposite directions"
5. Draw in the form of a bezier curve:
<Line>
<BezierCurve>
[323,149],[323,102.46249647638308],[200.51468698308443,100.05874793233771],[206,122]
</BezierCurve>
<BezierCurve>
[206,122],[211.62919227867525,144.51676911470102],[325,161.893029490424],[325,148]
</BezierCurve>
</Line>`

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

    return `GAME HISTORY:
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
}`;
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
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: GeminiSketchbotService.systemPrompt,
      });

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const context: GameContext = await request.json();

    // Validate request body
    if (!context || !context.image || !context.canvasDimensions) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const geminiService = new GeminiSketchbotService(apiKey);
    const response = await geminiService.generateTurn(context);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
