import { AICurveResponse, BezierCurve, CanvasDimensions, GameContext, Point, BaseTurn } from "@/app/types/exquisiteCorpse";
import { getBase64FileSizeMb } from "@/app/utils/base64";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { z } from "zod";

const PointSchema = z.tuple([z.number().finite(), z.number().finite()]);

const BezierCurveSchema = z.tuple([PointSchema, PointSchema, PointSchema, PointSchema]);

const AICurveResponseSchema = z.object({
  interpretation: z.string().min(1, "Interpretation cannot be empty"),
  curves: z.array(BezierCurveSchema).min(1, "Must provide at least 1 curve").max(15, "Cannot provide more than 15 curves"),
  reasoning: z.string().min(1, "Reasoning cannot be empty")
});

export class CurveDrawingService {
  private client: GoogleGenerativeAI;
  private static systemPrompt: string | null = null;
  private static MAX_IMG_SIZE_MB = 3;

  private static getSystemPrompt(): string {
    if (CurveDrawingService.systemPrompt === null) {
      const promptPath = path.join(process.cwd(), 'app', 'api', 'exquisite-corpse', 'draw-curve', 'systemPrompt.txt');
      CurveDrawingService.systemPrompt = fs.readFileSync(promptPath, 'utf8');
    }
    return CurveDrawingService.systemPrompt;
  }

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private buildPrompt<Turn extends BaseTurn>(context: GameContext<Turn>): string {
    const historyText = context.history
      .map((turn, index) => {
        if (turn.author === "user") {
          // FIXME: Should include the user's line at each turn as well as the full set of paths in the current state
          // ^ and also I guess the image?
          return `Turn ${index + 1}: User drew a line`;
        } else {
          const interpretation = 'interpretation' in turn ? turn.interpretation : undefined;
          const reasoning = 'reasoning' in turn ? turn.reasoning : undefined;
          return `Turn ${index + 1}: AI saw "${interpretation || 'the drawing'}" and ${reasoning || 'added their contribution'}`;
        }
      })
      .join("\n");

    return `
You are an expert graphic designer specializing in SVG art using the pen tool. You're playing a collaborative drawing game called "Exquisite Corpse."

DRAWING RULES:
- Dimensions: ${context.canvasDimensions.width}x${context.canvasDimensions.height} pixels
- Define your drawing as an <svg> element using only the <path> elements
- Assume all paths will be drawn with \`stroke="black"\` and \`stroke-width="2"\`

GAME HISTORY:
${historyText || "This is the first turn of the game."}

TASK:
Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life

Respond with a JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "svg": "Your change in the form of an <svg> element using only <path> elements",
  "reasoning": "Why you chose to add this specific substantial element and how it brings your interpretation to life"
}
`.trim();
  }

  private validateResponse(response: unknown): AICurveResponse {
    const validatedResponse = AICurveResponseSchema.parse(response);

    return {
      interpretation: validatedResponse.interpretation.trim(),
      curves: validatedResponse.curves as BezierCurve[],
      reasoning: validatedResponse.reasoning.trim(),
    };
  }

  private validateCurveBounds(
    curves: BezierCurve[],
    bounds: CanvasDimensions
  ): BezierCurve[] {
    return curves.map(curve => {
      return curve.map(([x, y]) => [
        Math.max(0, Math.min(bounds.width, Math.round(x))),
        Math.max(0, Math.min(bounds.height, Math.round(y)))
      ] as Point) as BezierCurve;
    });
  }

  async generateTurn<Turn extends BaseTurn>(context: GameContext<Turn>): Promise<AICurveResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: CurveDrawingService.getSystemPrompt(),
      });

      const prompt = this.buildPrompt<Turn>(context);

      // Convert base64 image to proper format for Gemini
      const imageData = context.image.replace('data:image/png;base64,', '');
      const imageSize = getBase64FileSizeMb(imageData);

      if (imageSize > CurveDrawingService.MAX_IMG_SIZE_MB) {
        throw new Error(`Image size ${imageSize}mb is greater than the max ${CurveDrawingService.MAX_IMG_SIZE_MB}mb`);
      }

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: "image/png"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
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
