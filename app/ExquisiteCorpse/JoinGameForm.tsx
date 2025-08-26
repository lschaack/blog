"use client";

import { useState } from 'react';
import { Button } from '@/app/components/Button';
import type { JoinGameRequest } from '@/app/types/multiplayer';

type JoinGameFormProps = {
  onBack: () => void;
  onGameJoined: (sessionId: string, playerId: string, isActive: boolean) => void;
};

export const JoinGameForm = ({ onBack, onGameJoined }: JoinGameFormProps) => {
  const [playerName, setPlayerName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!sessionId.trim() || sessionId.trim().length !== 5) {
      setError('Please enter a valid 5-character game ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: JoinGameRequest = {
        playerName: playerName.trim()
      };

      const response = await fetch(`/api/exquisite-corpse/games/${sessionId.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const data = await response.json();
      onGameJoined(sessionId.trim().toUpperCase(), data.playerId, data.isActive);

    } catch (err) {
      console.error('Join game error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
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
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={50}
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
            onChange={(e) => setSessionId(e.target.value.toUpperCase())}
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
            onClick={onBack}
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