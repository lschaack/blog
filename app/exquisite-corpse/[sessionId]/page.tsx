"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/Button';
import { MultiplayerGameSession } from '../MultiplayerGameSession';

export default function GameSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = params.sessionId as string;
  const playerId = searchParams.get('playerId');

  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimensions = { width: 512, height: 512 };

  // Validate required parameters
  useEffect(() => {
    if (!sessionId || !playerId) {
      setError('Missing game session information. Please start a new game.');
      return;
    }

    // If we have all required parameters, start the game
    setGameStarted(true);
  }, [sessionId, playerId]);

  const handleLeaveGame = () => {
    router.push('/exquisite-corpse');
  };

  if (error) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Game Session Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
        <Button
          label="Return to Lobby"
          onClick={handleLeaveGame}
          className="w-full"
        />
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading game session...</p>
      </div>
    );
  }

  return (
    <MultiplayerGameSession
      sessionId={sessionId}
      playerId={playerId!} // Already validated in useEffect
      dimensions={dimensions}
      onLeaveGame={handleLeaveGame}
    />
  );
}

