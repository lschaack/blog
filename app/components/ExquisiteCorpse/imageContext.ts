import { Line, PathCommand, isMoveToCommand, isMoveToRelativeCommand, isLineToCommand, isLineToRelativeCommand, isCubicBezierCommand, isCubicBezierRelativeCommand, isQuadraticBezierCommand, isQuadraticBezierRelativeCommand, isClosePathCommand } from "@/app/types/exquisiteCorpse";
import { ensureStartsWith } from "@/app/utils/string";

// New function to draw parsed path commands
export const drawParsedPath = (ctx: CanvasRenderingContext2D, path: PathCommand[]) => {
  ctx.beginPath();

  for (const command of path) {
    if (isMoveToCommand(command)) {
      ctx.moveTo(command[1], command[2]);
    } else if (isMoveToRelativeCommand(command)) {
      ctx.moveTo(command[1], command[2]); // Note: relative commands would need current position tracking
    } else if (isLineToCommand(command)) {
      ctx.lineTo(command[1], command[2]);
    } else if (isLineToRelativeCommand(command)) {
      ctx.lineTo(command[1], command[2]); // Note: relative commands would need current position tracking
    } else if (isCubicBezierCommand(command)) {
      ctx.bezierCurveTo(command[1], command[2], command[3], command[4], command[5], command[6]);
    } else if (isCubicBezierRelativeCommand(command)) {
      ctx.bezierCurveTo(command[1], command[2], command[3], command[4], command[5], command[6]); // Note: relative commands would need current position tracking
    } else if (isQuadraticBezierCommand(command)) {
      ctx.quadraticCurveTo(command[1], command[2], command[3], command[4]);
    } else if (isQuadraticBezierRelativeCommand(command)) {
      ctx.quadraticCurveTo(command[1], command[2], command[3], command[4]); // Note: relative commands would need current position tracking
    } else if (isClosePathCommand(command)) {
      ctx.closePath();
    }
    // Add more command types as needed
  }

  ctx.stroke();
};

const drawLine = (ctx: CanvasRenderingContext2D, line: Line) => {
  // Line is now ParsedPath format
  drawParsedPath(ctx, line);
};

/**
 * Renders the provided bezier curves to a base64-encoded PNG
 * @param lines Array of lines representing the current drawing
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @returns Promise resolving to base64-encoded PNG string
 */
export const renderLinesToBase64 = async (
  lines: Line[],
  width: number,
  height: number,
  backgroundImage?: string
): Promise<string> => {
  // Get device pixel ratio for DPI scaling
  const dpr = window.devicePixelRatio || 1;

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Scale the context to handle DPI
  ctx.scale(dpr, dpr);

  // Clear the canvas with white background or draw background image
  if (backgroundImage) {
    // Create an image element to load the background
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load background image'));
      img.src = ensureStartsWith(backgroundImage, 'data:image/png;base64,');
    });

    // Draw the background image
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }

  // Set drawing style
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw each line
  lines.forEach(line => drawLine(ctx, line));

  // Convert to base64
  return canvas.toDataURL('image/png', 0.9);
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
