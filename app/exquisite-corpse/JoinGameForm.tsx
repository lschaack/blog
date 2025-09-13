"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/components/Button';
import { MAX_PLAYER_NAME_LENGTH } from '../api/exquisite-corpse/schemas';

type JoinGameFormProps = {
  initPlayerName?: string;
  initSessionId?: string;
};

export const JoinGameForm = ({
  initPlayerName = '',
  initSessionId = '',
}: JoinGameFormProps) => {
  const router = useRouter();

  const [playerName, setPlayerName] = useState(initPlayerName);
  const [sessionId, setSessionId] = useState(initSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinGame = async () => {
    if (!playerName) {
      setError('Please enter your name');
      return;
    }

    if (!sessionId || sessionId.length !== 5) {
      setError('Please enter a valid 5-character game ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const joinResponse = await fetch(`/api/exquisite-corpse/games/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName: playerName }),
      });

      if (!joinResponse.ok) {
        const { error } = await joinResponse.json();

        setError(error);
      } else {
        router.push(`/exquisite-corpse/${sessionId}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Join Game</h1>
        <p className="text-gray-600">Enter the 5-character game ID</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="player-name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.trim())}
            placeholder="Enter your name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={MAX_PLAYER_NAME_LENGTH}
          />
        </div>

        <div>
          <label htmlFor="session-id" className="block text-sm font-medium text-gray-700 mb-1">
            Game ID
          </label>
          <input
            id="session-id"
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.toUpperCase().trim())}
            placeholder="ABCD1"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
            disabled={isLoading}
            maxLength={5}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            label="Back"
            onClick={router.back}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            label={isLoading ? 'Joining...' : 'Join Game'}
            onClick={handleJoinGame}
            disabled={isLoading || !playerName.trim() || !sessionId.trim()}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
