"use client";

import { useCallback } from 'react';
import { useRouter } from "next/navigation";
import { useSSEConnection } from './useSSEConnection';
import { MultiplayerCurveTurnRenderer } from './MultiplayerCurveTurnRenderer';
import { Button } from '@/app/components/Button';
import type { CurveTurn, BaseTurn } from '@/app/types/exquisiteCorpse';
import { downloadBlob } from '@/app/utils/blob';
import { getCurrentPlayer } from '../lib/gameUtils';

type MultiplayerGameSessionProps = {
  sessionId: string;
  playerName?: string;
  dimensions: { width: number; height: number };
};

export const MultiplayerGameSession = ({
  sessionId,
  playerName,
  dimensions,
}: MultiplayerGameSessionProps) => {
  const router = useRouter();
  const {
    connectionState,
    error: connectionError,
    gameState,
    status,
    reconnect
  } = useSSEConnection(
    sessionId,
    playerName,
  );

  // Handle leaving game
  const handleLeaveGame = useCallback(async () => {
    if (sessionId) {
      try {
        // Notify backend that player is leaving
        await fetch(`/api/exquisite-corpse/games/${sessionId}/disconnect`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Failed to notify backend of player leaving:', error);
      }
    }

    // Call the provided leave game handler (which will navigate away)
    router.push('/exquisite-corpse');
  }, [sessionId, router]);

  // Submit turn to server
  const handleSubmitTurn = useCallback(async (turnData: Omit<CurveTurn, keyof BaseTurn>) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/exquisite-corpse/games/${sessionId}/turns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit turn');
      }

    } catch (error) {
      console.error('Failed to submit turn:', error);
      throw error;
    }
  }, [sessionId]);

  // Retry AI turn
  const handleRetryAI = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/exquisite-corpse/games/${sessionId}/retry-ai`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry AI turn');
      }

    } catch (error) {
      console.error('Failed to retry AI turn:', error);
      throw error;
    }
  }, [sessionId]);

  // Download game state as JSON
  const handleDownloadJSON = useCallback(() => {
    if (!gameState) return;

    const jsonString = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    downloadBlob(blob, `multiplayer-game-${sessionId}-${Date.now()}.json`);
  }, [gameState, sessionId]);

  // Show loading/connecting state
  // TODO: put this in its own component and check player name exists
  if (connectionState !== 'connected' || !gameState) {
    return (
      <div className="flex flex-col gap-4 max-w-[512px] mx-auto p-6">
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <div className="font-semibold text-2xl [font-variant:all-small-caps]">
            {connectionState}
          </div>
          {connectionError && (
            <div className="text-red-600 font-semibold font-geist-mono mt-2 max-w-[30ch]">
              {connectionError}
            </div>
          )}
        </div>

        {connectionError && (
          <Button
            label="Reconnect"
            onClick={reconnect}
            className="w-full"
          />
        )}

        <Button
          label="Return to Lobby"
          onClick={handleLeaveGame}
          className="w-full"
        />
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer(gameState);

  if (!currentPlayer) {
    // FIXME: This should only happen when navigating away (when game update comes back
    // before navigation completes), but would be a pretty big problem otherwise
    console.warn('No current player');
    return null;
  }

  const isCurrentPlayer = currentPlayer.name === playerName;

  return (
    <div className="flex flex-col gap-4 max-w-[512px] mx-auto">
      {/* Game Info Header */}
      <div className="p-4 bg-gray-50 rounded-xl flex justify-between">
        {/* Info */}
        <div className="flex-1">
          <div className="font-semibold">Game {sessionId}</div>

          <div className="text-sm space-y-1">
            <div>Type: {gameState.type === 'singleplayer' ? 'AI Game' : 'Multiplayer'}</div>
            <div>Players: {Object.keys(gameState.players).length}</div>
          </div>

          {/* Players List */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-1">Players:</div>
            <div className="flex flex-wrap gap-2">
              {Object.values(gameState.players).map(player => (
                <span
                  key={player.name}
                  className={`px-2 py-1 rounded text-xs ${player.name === currentPlayer.name
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                    }`}
                >
                  {
                    `${player.name
                    }${player.name === playerName ? ' (you)' : ''
                    }${player.name === currentPlayer.name ? ' ⭐' : ''}`
                  }
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-around">
          <Button
            label="Download Game JSON"
            onClick={handleDownloadJSON}
            disabled={!gameState || gameState.turns.length === 0}
            friendly
          />
          <Button
            label="Leave"
            onClick={handleLeaveGame}
            danger
          />
        </div>
      </div>

      {/* Game Status */}
      {/* FIXME: clean this up */}
      <div className="text-center p-2 bg-deep-50 rounded-xl font-semibold text-deep-600">
        {status === 'ai_turn_started' && 'AI is drawing...'}
        {status === 'ai_turn_failed' && (
          <div className="space-y-2">
            <div className="text-red-600">AI turn failed</div>
            <Button
              label="Retry AI Turn"
              onClick={handleRetryAI}
              className="text-sm"
            />
          </div>
        )}
        {status === 'turn_ended' && isCurrentPlayer && 'Your turn!'}
        {status === 'turn_ended' && !isCurrentPlayer &&
          `Waiting for ${currentPlayer.name}`}
        {status === 'game_started' && isCurrentPlayer && 'Start drawing!'}
      </div>

      {/* Game Canvas */}
      <MultiplayerCurveTurnRenderer
        handleEndTurn={handleSubmitTurn}
        readOnly={!isCurrentPlayer}
        canvasDimensions={dimensions}
        turns={gameState.turns}
        currentTurnIndex={gameState.turns.length}
        currentUserId={playerName}
      />
    </div>
  );
};
