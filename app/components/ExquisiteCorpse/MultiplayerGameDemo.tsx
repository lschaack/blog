"use client";

import { MultiplayerGame } from './MultiplayerGame';

export const MultiplayerGameDemo = () => {
  const dimensions = { width: 512, height: 512 };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <MultiplayerGame dimensions={dimensions} />
    </div>
  );
};