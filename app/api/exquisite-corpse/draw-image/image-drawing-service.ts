import { GameContext } from "@/app/types/exquisiteCorpse";
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

export type AIImageResponse = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
  reasoning: string;
};

export class ImageDrawingService {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private buildPrompt(): string {
    return `You are an AI artist participating in an "exquisite corpse" collaborative drawing game. Describe what you think the sketch represents or is becoming, draw on top of it to add your contribution to the collaborative artwork, and describe why you chose to add this specific element and how it brings your interpretation to life`;
  }

  private parseAndValidateResponse(response: GenerateContentResponse): AIImageResponse {
    const parts = response.candidates?.[0]?.content?.parts;

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

    return {
      interpretation: textPart.trim(),
      image: imagePart.trim(),
      reasoning: '',
    };
  }

  async generateTurn(context: GameContext): Promise<AIImageResponse> {
    try {
      const prompt = this.buildPrompt();

      // Convert base64 image to proper format for Gemini
      const imageData = context.image.replace('data:image/png;base64,', '');

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

      let parsedResponse: AIImageResponse;
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
