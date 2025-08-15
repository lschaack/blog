import { AICurveResponse, BezierCurve, CanvasDimensions, GameContext, Point, CurveTurn } from "@/app/types/exquisiteCorpse";
import { getBase64FileSizeMb } from "@/app/utils/base64";
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { z } from "zod";
import parseSvgPath from "parse-svg-path";

const AICurveResponseSchema = z.object({
  interpretation: z.string().min(1, "Interpretation cannot be empty"),
  path: z
    .string()
    .min(1, "Path cannot be empty")
    .transform((string, ctx) => {
      // extract the `d` property
      const match = string.match(/^([MLHVCSQTAZ0-9\s,.\-+]+)$/);

      if (!match) {
        ctx.addIssue({
          code: "custom",
          message: "Path must be a single line of only absolute (uppercase) commands",
          input: string,
        });

        return z.NEVER;
      }

      const path = match[1];

      return parseSvgPath(path);
    }),
  reasoning: z.string().min(1, "Reasoning cannot be empty")
});

// FIXME:
// - validate input as curve turn
// - validate output against schema
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

  // FIXME: history should include:
  // - the current svg with data- properties indicating the author and turn number of each path element
  // - the history of the AI's interpretations and reasonings, with reasonings possibly also being in a data- prop for the associated path
  private buildPrompt(context: GameContext<CurveTurn>): string {
    return `
You are an expert graphic designer specializing in SVG art using the pen tool. You're playing a collaborative drawing game called "Exquisite Corpse."

DRAWING RULES:
- Define your addition as a single line of path commands as used in the \`d\` parameter of a \`<path>\` element
- Only use absolute commands

GAME STATE:
${renderPathCommandsToSvg(context.history.map(turn => turn.path), context.canvasDimensions)}

TASK:
Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life

Respond with a JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "path": "Your addition as a line of path commands",
  "reasoning": "Why you chose to add this specific substantial element and how it brings your interpretation to life"
}
`.trim();
  }

  private validateResponse(json: unknown): AICurveResponse {
    const validatedResponse = AICurveResponseSchema.parse(json);

    return {
      interpretation: validatedResponse.interpretation.trim(),
      path: validatedResponse.path,
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

  async generateTurn(context: GameContext<CurveTurn>): Promise<AICurveResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = this.buildPrompt(context);

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
      //const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      console.log('text', text)

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

      return validatedResponse;

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`AI turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
