import { BezierCurve, Line } from "@/app/types/exquisiteCorpse";

// Canvas drawing utilities for AI context generation
const drawBezierCurve = (ctx: CanvasRenderingContext2D, curve: BezierCurve) => {
  const [start, cp1, cp2, end] = curve;
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
  ctx.stroke();
};

const drawLine = (ctx: CanvasRenderingContext2D, line: Line) => {
  line.forEach(curve => drawBezierCurve(ctx, curve));
};

/**
 * Renders the current game state to a base64-encoded PNG for AI context
 * @param lines Array of lines representing the current drawing
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @returns Promise resolving to base64-encoded PNG string
 */
export const renderGameStateToBase64 = async (
  lines: Line[],
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create offscreen canvas for rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Set drawing style - consistent with main app
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Fill with white background for better AI analysis
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw all lines
      lines.forEach(line => drawLine(ctx, line));

      // Convert to base64 PNG
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image blob'));
        };
        reader.readAsDataURL(blob);
      }, 'image/png', 1.0);

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Creates a lightweight game context summary for AI
 * @param turns Array of completed turns
 * @returns Simplified history for AI context
 */
export const createGameContextSummary = (turns: { author: "user" | "ai"; interpretation?: string; reasoning?: string }[]) => {
  return turns.map((turn, index) => ({
    turn: index + 1,
    author: turn.author as "user" | "ai",
    interpretation: turn.interpretation,
    reasoning: turn.reasoning,
  }));
};

/**
 * Validates that an image string is a valid base64 PNG
 * @param imageString Base64 image string to validate
 * @returns boolean indicating if the image is valid
 */
export const validateBase64Image = (imageString: string): boolean => {
  try {
    // Check if it starts with the correct data URL prefix
    if (!imageString.startsWith('data:image/png;base64,')) {
      return false;
    }

    // Extract base64 part
    const base64Data = imageString.replace('data:image/png;base64,', '');

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Data)) {
      return false;
    }

    // Check minimum length (empty PNG would be much larger)
    if (base64Data.length < 100) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Estimates the size of a base64 image string in bytes
 * @param base64String Base64 encoded image
 * @returns Estimated size in bytes
 */
export const estimateImageSize = (base64String: string): number => {
  const base64Data = base64String.replace('data:image/png;base64,', '');
  // Base64 encoding increases size by ~33%, so decode length * 0.75
  return Math.ceil(base64Data.length * 0.75);
};

/**
 * Checks if image size is within API limits (rough estimate for Gemini)
 * @param base64String Base64 encoded image
 * @returns boolean indicating if size is acceptable
 */
export const checkImageSizeLimit = (base64String: string): boolean => {
  const sizeInBytes = estimateImageSize(base64String);
  const maxSizeInBytes = 20 * 1024 * 1024; // 20MB limit for Gemini
  return sizeInBytes < maxSizeInBytes;
};
