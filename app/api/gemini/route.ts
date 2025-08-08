import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

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
  private static systemPrompt: string | null = null;

  private static getSystemPrompt(): string {
    if (GeminiSketchbotService.systemPrompt === null) {
      const promptPath = path.join(process.cwd(), 'app', 'api', 'gemini', 'systemPrompt.txt');
      GeminiSketchbotService.systemPrompt = fs.readFileSync(promptPath, 'utf8');
    }
    return GeminiSketchbotService.systemPrompt;
  }

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
        systemInstruction: GeminiSketchbotService.getSystemPrompt(),
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
