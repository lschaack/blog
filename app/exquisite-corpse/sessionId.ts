export const SESSION_ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SESSION_ID_MATCHER = /^[0-9A-Z]{5}$/;

export function generateSessionId(): string {
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += SESSION_ID_CHARS.charAt(Math.floor(Math.random() * SESSION_ID_CHARS.length));
  }

  return result;
}
