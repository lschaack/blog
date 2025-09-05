import type { Line } from '@/app/types/exquisiteCorpse';

// Server-side image rendering utilities using node-canvas or similar
// For now, we'll create a placeholder that returns a simple base64 image

/**
 * Server-side version of renderLinesToBase64
 * This is a simplified version that creates a placeholder image
 * In a production environment, you'd want to use node-canvas or similar
 */
// FIXME: WTF claude
export const renderLinesToBase64Server = async (
  lines: Line[],
  width: number,
  height: number,
  backgroundImage?: string
): Promise<string> => {
  // For now, return a simple white image as base64
  // In production, you'd implement actual server-side canvas rendering

  // TODO: Use lines and backgroundImage parameters
  console.log(`Rendering ${lines.length} lines${backgroundImage ? ' with background' : ''}`);

  // Create a minimal PNG header for a white image
  const canvas = createSimpleWhiteImage(width, height);
  return canvas;
};

/**
 * Create a simple white image as base64 PNG
 * This is a placeholder - in production you'd use proper canvas rendering
 */
function createSimpleWhiteImage(width: number, height: number): string {
  // Create a minimal base64 PNG for a white rectangle
  // This is a very basic implementation
  const header = 'data:image/png;base64,';

  // TODO: Use width and height to create properly sized image
  console.log(`Creating ${width}x${height} white image`);

  // Simple 1x1 white PNG base64
  const whitePixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  return header + whitePixel;
}

/**
 * Validates that an image string is a valid base64 PNG
 */
export const validateBase64ImageServer = (imageString: string): boolean => {
  try {
    if (!imageString.startsWith('data:image/png;base64,')) {
      return false;
    }

    const base64Data = imageString.replace('data:image/png;base64,', '');
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Data)) {
      return false;
    }

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
 */
export const estimateImageSizeServer = (base64String: string): number => {
  const base64Data = base64String.replace('data:image/png;base64,', '');
  return Math.ceil(base64Data.length * 0.75);
};

/**
 * Checks if image size is within API limits
 */
export const checkImageSizeLimit = (base64String: string): boolean => {
  const sizeInBytes = estimateImageSizeServer(base64String);
  const maxSizeInBytes = 20 * 1024 * 1024; // 20MB limit
  return sizeInBytes < maxSizeInBytes;
};
