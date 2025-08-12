import { GoogleGenerativeAI } from "@google/generative-ai";
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
  private client: GoogleGenerativeAI;
  private static systemPrompt: string | null = null;

  private static getSystemPrompt(): string {
    if (ImageDrawingService.systemPrompt === null) {
      const promptPath = path.join(process.cwd(), 'app', 'api', 'exquisite-corpse', 'draw-image', 'systemPrompt.txt');
      ImageDrawingService.systemPrompt = fs.readFileSync(promptPath, 'utf8');
    }
    return ImageDrawingService.systemPrompt;
  }

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
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
3. Draw on top of the image to add a substantial artistic addition that advances the drawing
4. Don't be timid - make an addition that clearly advances the drawing toward your vision
5. Think about the complete form you want to make, then draw to achieve it
6. Return a new image that includes your addition drawn on top of the existing image

Respond with a JSON object in this exact format:
{
  "interpretation": "What you think this drawing represents or is becoming",
  "image": "base64-encoded PNG image with your addition drawn on top",
  "reasoning": "Why you chose to add this specific element and how it brings your interpretation to life"
}`;
  }

  private validateResponse(response: unknown): AIImageResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid AI response format');
    }

    const { interpretation, image, reasoning } = response as { interpretation: unknown; image: unknown; reasoning: unknown };

    if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
      throw new Error('Invalid or missing interpretation');
    }

    if (typeof image !== 'string' || image.trim().length === 0) {
      throw new Error('Invalid or missing image');
    }

    if (typeof reasoning !== 'string' || reasoning.trim().length === 0) {
      throw new Error('Invalid or missing reasoning');
    }

    return {
      interpretation: interpretation.trim(),
      image: image.trim(),
      reasoning: reasoning.trim(),
    };
  }

  async generateTurn(context: GameContext): Promise<AIImageResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: ImageDrawingService.getSystemPrompt(),
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

      return validatedResponse;

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`AI image turn generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}