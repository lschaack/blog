import type { CurveTurn, ImageTurn, Turn } from '@/app/types/exquisiteCorpse';

// Type guards to distinguish turn types
export const isCurveTurn = (turn: Turn): turn is CurveTurn => {
  return 'line' in turn;
};

export const isImageTurn = (turn: Turn): turn is ImageTurn => {
  return 'image' in turn;
};

