import { AICurveResponse, GameContext, CurveTurn } from "@/app/types/exquisiteCorpse";
import { getBase64FileSizeMb } from "@/app/utils/base64";
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { GoogleGenAI, Modality } from "@google/genai";
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
  reasoning: z.string().min(1, "Reasoning cannot be empty"),
});

// FIXME:
// - validate input as curve turn
// - validate output against schema
export class CurveDrawingService {
  private client: GoogleGenAI;
  private static MAX_IMG_SIZE_MB = 3;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
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

PLANNING:
- Before writing any path commands, plan your addition by modifying the rasterized image with these rules, but don't send it back:
    - Only use 2px black strokes against the white background
    - Draw with a single line, think "don't lift the pen"
    - Don't change the size of the image
- After planning, use as many curves as necessary to approximate your changes

GAME STATE:
${renderPathCommandsToSvg(context.history.map(turn => turn.path), context.canvasDimensions)}

TASK:
Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life

Respond with a JSON object in this exact format:
{
  "interpretation": "One to two sentences describing what you think this drawing represents or is becoming",
  "path": "Your addition as a line of path commands",
  "reasoning": "One to two sentences describing why you chose to add this specific substantial element and how it brings your interpretation to life",
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

  async generateTurn(context: GameContext<CurveTurn>): Promise<AICurveResponse> {
    try {
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

      const result = await this.client.models.generateContent({
        //model: "gemini-2.5-flash",
        model: "gemini-2.0-flash-preview-image-generation",
        contents: [prompt, imagePart],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        }
      });

      const text = result.text;
      if (!text) throw new Error('No text part of model response');
      else console.log('got response text:', text)

      const data = result.data;
      if (data) console.log('got data', data);

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
      if (data) validatedResponse.image = data.trim();

      return validatedResponse;

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`AI turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
