import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import fs from 'fs';
import path from 'path';

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

export type AIImageResponse = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
  reasoning: string;
};

export class ImageDrawingService {
  private client: GoogleGenAI;
  private static systemPrompt: string | null = null;

  private static getSystemPrompt(): string {
    if (ImageDrawingService.systemPrompt === null) {
      const promptPath = path.join(process.cwd(), 'app', 'api', 'exquisite-corpse', 'draw-image', 'systemPrompt.txt');
      ImageDrawingService.systemPrompt = fs.readFileSync(promptPath, 'utf8');
    }
    return ImageDrawingService.systemPrompt;
  }

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private buildPrompt(context: GameContext): string {
    const historyText = context.history
      .map(turn => {
        if (turn.author === "user") {
          return `Turn ${turn.turn}: User drew on the image`;
        } else {
          return `Turn ${turn.turn}: AI saw "${turn.interpretation}" and ${turn.reasoning}`;
        }
      })
      .join("\n");

    return `GAME HISTORY:
${historyText || "This is the first turn of the game."}

CURRENT TURN: ${context.currentTurn}

TASK:
1. Analyze the current image carefully - look for shapes, lines, patterns, and potential connections
2. Interpret what the drawing is becoming (be creative and confident!)
3. Add detail to the image, or take it in an unexpected direction

Respond with a text part JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "reasoning": "Why you chose to add this specific element and how it brings your interpretation to life"
}
Include an inlineData image part containing a complete base64-encoded PNG image with your modifications`;
  }

  private parseAndValidateResponse(response: GenerateContentResponse): AIImageResponse {
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts || !Array.isArray(parts)) {
      throw new Error('Invalid AI response format');
    }

    const [textPart, imagePart] = parts;

    if (!textPart.text) throw new Error('Missing text part of AI response');
    if (!imagePart.inlineData) throw new Error('Missing image part of AI response');

    // Extract JSON from response text (in case there's extra text)
    const jsonMatch = textPart.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const { interpretation, reasoning } = JSON.parse(jsonMatch[0]);

    if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
      throw new Error('Invalid or missing interpretation');
    }

    if (typeof reasoning !== 'string' || reasoning.trim().length === 0) {
      throw new Error('Invalid or missing reasoning');
    }

    if (imagePart.inlineData.mimeType !== 'image/png' || !imagePart.inlineData.data) {
      throw new Error('Invalid or missing image');
    }

    return {
      interpretation: interpretation.trim(),
      image: imagePart.inlineData.data.trim(),
      reasoning: reasoning.trim(),
    };
  }

  async generateTurn(context: GameContext): Promise<AIImageResponse> {
    try {
      const prompt = this.buildPrompt(context);

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
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      });

      console.log('result.candidates[0].content.parts', result.candidates?.[0].content?.parts)
      if ((result.candidates?.length ?? 0) > 1) {
        console.info('received more than one response candidate');
      }

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
