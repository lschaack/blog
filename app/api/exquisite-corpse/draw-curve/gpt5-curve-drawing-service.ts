import { AICurveResponse, GameContext, CurveTurn } from "@/app/types/exquisiteCorpse";
import { getBase64FileSizeMb } from "@/app/utils/base64";
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { z } from "zod";
import { jsonrepair } from 'jsonrepair';
import OpenAI from 'openai';
import { LineSchema } from "../schemas";

const AICurveResponseSchema = z.object({
  interpretation: z.string().min(1, "Interpretation cannot be empty"),
  path: LineSchema,
  reasoning: z.string().min(1, "Reasoning cannot be empty"),
  title: z.string().min(1, "Title cannot be empty"),
});

export class GPT5CurveDrawingService {
  private client: OpenAI;
  private static MAX_IMG_SIZE_MB = 3;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  private buildPrompt(context: GameContext<CurveTurn>): string {
    return `
You are an expert graphic designer specializing in vector art using the pen tool. You're playing a collaborative drawing game called "Exquisite Corpse."

DRAWING RULES:
- Define your addition as a single line of path commands as used in the \`d\` parameter of a \`<path>\` element
- Only use absolute commands

GAME STATE:
${renderPathCommandsToSvg(context.history.map(turn => turn.path), context.canvasDimensions)}

TASK:
Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life

Respond with a JSON object in this exact format:
{
  "interpretation": "One to two sentences describing what you think this drawing represents or is becoming",
  "path": "Your addition as a line of path commands",
  "reasoning": "One to two sentences describing why you chose to add this specific substantial element and how it brings your interpretation to life",
  "title": "An appellation befitting a masterpiece",
}
`.trim();
  }

  private validateResponse(json: unknown): AICurveResponse {
    const validatedResponse = AICurveResponseSchema.parse(json);

    return {
      interpretation: validatedResponse.interpretation.trim(),
      path: validatedResponse.path,
      reasoning: validatedResponse.reasoning.trim(),
      title: validatedResponse.title.trim(),
    };
  }

  async generateTurn(context: GameContext<CurveTurn>): Promise<AICurveResponse> {
    try {
      const prompt = this.buildPrompt(context);

      // Convert base64 image to proper format for OpenAI
      const imageData = context.image;
      const base64Data = imageData.replace('data:image/png;base64,', '');
      const imageSize = getBase64FileSizeMb(base64Data);

      if (imageSize > GPT5CurveDrawingService.MAX_IMG_SIZE_MB) {
        throw new Error(`Image size ${imageSize}mb is greater than the max ${GPT5CurveDrawingService.MAX_IMG_SIZE_MB}mb`);
      }

      const response = await this.client.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('No content in OpenAI response');
      }

      console.log('got response text:', text);

      // Parse JSON response
      let json;
      let parsedResponse;
      try {
        json = jsonrepair(text);
      } catch (repairError) {
        throw new Error(`Received unrepairable JSON from AI response: ${text}\nError: ${repairError}`);
      }
      try {
        parsedResponse = JSON.parse(json);
      } catch (parseError) {
        throw new Error(`Somehow failed to parse repaired json: ${parseError}\nError: ${parseError}`);
      }

      // Validate the response structure
      const validatedResponse = this.validateResponse(parsedResponse);

      return validatedResponse;

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
