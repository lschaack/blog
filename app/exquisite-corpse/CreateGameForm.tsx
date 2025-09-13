"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/Button';
import { CreateWithPlayerRequest, GameType, MAX_PLAYER_NAME_LENGTH } from '../api/exquisite-corpse/schemas';

type CreateGameFormProps = {
  gameType: GameType;
};

export const CreateGameForm = ({ gameType }: CreateGameFormProps) => {
  const router = useRouter();

  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: CreateWithPlayerRequest = {
        gameType,
        playerName,
      };

      const createGameResponse = await fetch('/api/exquisite-corpse/games/create-with-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!createGameResponse.ok) {
        const errorData = await createGameResponse.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const createGameData = await createGameResponse.json();

      router.push(`/exquisite-corpse/${createGameData.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          Create {gameType === 'singleplayer' ? 'AI' : 'Multiplayer'} Game
        </h1>
        <p className="text-gray-600">
          {gameType === 'singleplayer'
            ? 'Start a collaborative drawing session with AI'
            : 'Create a game for you and your friends'
          }
        </p>
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
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={MAX_PLAYER_NAME_LENGTH}
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
            label={isLoading ? 'Creating...' : 'Create Game'}
            onClick={handleCreateGame}
            disabled={isLoading || !playerName.trim()}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};
