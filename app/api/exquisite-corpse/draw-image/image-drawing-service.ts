import { AIImageResponseGeminiFlashPreview, GameContext, BaseTurn } from "@/app/types/exquisiteCorpse";
import { getBase64FileSizeMb } from "@/app/utils/base64";
import { GeminiResponseSchema } from "@/app/utils/gemini";
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { z } from "zod";

const AIImageResponseSchema = z.object({
  interpretation: z.string().min(1, "Interpretation cannot be empty"),
  image: z.string().min(1, "Image data cannot be empty")
});

export class ImageDrawingService {
  private client: GoogleGenAI;

  private static MAX_IMG_SIZE_MB = 3;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private buildPrompt<Turn extends BaseTurn>(context: GameContext<Turn>): string {
    return `
You are an AI artist participating in an "exquisite corpse" collaborative drawing game. Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life

DRAWING RULES:
- Only use 2px black strokes against the white background
- Draw with a single line, think "don't lift the pen"
- Don't change the size of the image

GAME HISTORY:
${context.history.map((turn, index) => {
      const interpretation = 'interpretation' in turn ? turn.interpretation : undefined;
      return `On turn ${index + 1}, you thought "${interpretation || 'something interesting'}"`;
    }).join('\n')}
`.trim();
  }

  private parseAndValidateResponse(response: GenerateContentResponse): AIImageResponseGeminiFlashPreview {
    const geminiResponse = GeminiResponseSchema.parse(response);

    const parts = geminiResponse.candidates?.[0]?.content?.parts;

    if (!parts || !Array.isArray(parts)) {
      throw new Error('Invalid AI response format');
    }

    let textPart = '';
    let imagePart = '';

    for (const part of parts) {
      if (part.text) {
        textPart = textPart.concat(part.text + '\n');
      } else if (part.inlineData?.data) {
        if (part.inlineData.mimeType === 'image/png') {
          imagePart = imagePart.concat(part.inlineData.data);
        }
      }
    }

    const result = {
      interpretation: textPart.trim(),
      image: imagePart.trim(),
    };

    return AIImageResponseSchema.parse(result);
  }

  async generateTurn<Turn extends BaseTurn>(context: GameContext<Turn>): Promise<AIImageResponseGeminiFlashPreview> {
    try {
      const prompt = this.buildPrompt<Turn>(context);

      // Convert base64 image to proper format for Gemini
      const imageData = context.image.replace('data:image/png;base64,', '');
      const imageSize = getBase64FileSizeMb(imageData);

      if (imageSize > ImageDrawingService.MAX_IMG_SIZE_MB) {
        throw new Error(`Image size ${imageSize}mb is greater than the max ${ImageDrawingService.MAX_IMG_SIZE_MB}mb`);
      }

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: "image/png"
        }
      };

      const result = await this.client.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: [prompt, imagePart],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        }
      });

      let parsedResponse: AIImageResponseGeminiFlashPreview;
      try {
        parsedResponse = this.parseAndValidateResponse(result);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }

      return parsedResponse;

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`AI image turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
