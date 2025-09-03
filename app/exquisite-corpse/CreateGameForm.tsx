import { useState } from 'react';
import { Button } from '@/app/components/Button';
import type { GameType, CreateGameRequest } from '@/app/types/multiplayer';

type CreateGameFormProps = {
  gameType: GameType;
  onBack: () => void;
  onGameCreated: (sessionId: string, playerId: string, isActive: boolean) => void;
};

export const CreateGameForm = ({ gameType, onBack, onGameCreated }: CreateGameFormProps) => {
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
      const request: CreateGameRequest = {
        gameType,
        playerName: playerName.trim()
      };

      const response = await fetch('/api/exquisite-corpse/games/create-with-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const data = await response.json();
      onGameCreated(data.sessionId, data.playerId, true); // Creator is always active

    } catch (err) {
      console.error('Create game error:', err);
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
            maxLength={50}
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
            onClick={onBack}
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
