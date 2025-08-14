export function getBase64FileSizeBytes(base64String: string) {
  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64String.split(',').pop() ?? '';

  // Calculate actual byte size
  // Base64 encoding adds ~33% overhead (4 chars = 3 bytes)
  let sizeInBytes = (base64Data.length * 3) / 4;

  // Account for padding characters (=)
  const paddingChars = (base64Data.match(/=/g) || []).length;
  sizeInBytes -= paddingChars;

  return sizeInBytes;
}

const ONE_MB = 1024 * 1024;
export function getBase64FileSizeMb(base64String: string) {
  const sizeInBytes = getBase64FileSizeBytes(base64String);
  const sizeInMb = sizeInBytes / ONE_MB;
  const fixed = Math.round(sizeInMb * 100) / 100; // round to 2 places

  return fixed;
}
