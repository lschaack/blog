"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { CreateGameForm } from '../CreateGameForm';
import { useCallback } from 'react';
import { Button } from '@/app/components/Button';
import { GameType } from '@/app/api/exquisite-corpse/schemas';

function GameTypeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getHandleChooseType = useCallback((type: GameType) => {
    return () => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.append('type', type);

      router.push(`?${newParams.toString()}`);
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col gap-6 mx-auto p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Exquisite Corpse</h1>
        <p className="text-gray-600">Choose how you want to play</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          label="New AI Game"
          onClick={getHandleChooseType('singleplayer')}
          className="w-full text-left justify-start"
        />
        <Button
          label="New Multiplayer Game"
          onClick={getHandleChooseType('multiplayer')}
          className="w-full text-left justify-start"
        />
      </div>
    </div>
  )
}

export default function NewGamePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameType = searchParams.get('type');

  const handleGameJoined = (sessionId: string) => {
    router.push(`/exquisite-corpse/${sessionId}`);
  };

  if (!gameType || (gameType !== 'singleplayer' && gameType !== 'multiplayer')) {
    return (
      <GameTypeSelector />
    );
  } else {
    return (
      <CreateGameForm
        gameType={gameType}
        onBack={router.back}
        onGameCreated={handleGameJoined}
      />
    );
  }
}
