"use client";

import { useState } from 'react';
import { Button } from '@/app/components/Button';
import { CurveGame } from './CurveGame';
import { MultiplayerGame } from './MultiplayerGame';

type GameMode = 'single' | 'multiplayer';

export const ExquisiteCorpseGame = () => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const dimensions = { width: 512, height: 512 };

  if (gameMode === null) {
    return (
      <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Exquisite Corpse</h1>
          <p className="text-gray-600">Choose your game mode</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            label="Single Player (Local AI)"
            onClick={() => setGameMode('single')}
            className="w-full text-left justify-start"
          />
          <Button
            label="Multiplayer (Online)"
            onClick={() => setGameMode('multiplayer')}
            className="w-full text-left justify-start"
          />
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>Single Player: Play locally with AI (original mode)</p>
          <p>Multiplayer: Play online with others or AI</p>
        </div>
      </div>
    );
  }

  if (gameMode === 'single') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <Button
            label="← Back to Mode Selection"
            onClick={() => setGameMode(null)}
            className="text-sm"
          />
        </div>
        <CurveGame dimensions={dimensions} />
      </div>
    );
  }

  if (gameMode === 'multiplayer') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <Button
            label="← Back to Mode Selection"
            onClick={() => setGameMode(null)}
            className="text-sm"
          />
        </div>
        <MultiplayerGame dimensions={dimensions} />
      </div>
    );
  }

  return null;
};