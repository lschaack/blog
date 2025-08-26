import { useCallback } from 'react';
import { useSSEConnection } from './useSSEConnection';
import { MultiplayerCurveTurnRenderer } from './MultiplayerCurveTurnRenderer';
import { Button } from '@/app/components/Button';
import type { CurveTurn, BaseTurn } from '@/app/types/exquisiteCorpse';
import { downloadBlob } from '@/app/utils/blob';
import { getCurrentPlayer } from '../lib/gameUtils';

type MultiplayerGameSessionProps = {
  sessionId: string;
  playerId: string;
  dimensions: { width: number; height: number };
  onLeaveGame: () => void;
};

export const MultiplayerGameSession = ({
  sessionId,
  playerId,
  dimensions,
  onLeaveGame
}: MultiplayerGameSessionProps) => {
  const { connectionState, isConnected, error: connectionError, gameState, reconnect } = useSSEConnection(
    sessionId,
    playerId
  );

  // Handle leaving game
  const handleLeaveGame = useCallback(async () => {
    if (sessionId && playerId) {
      try {
        // Notify backend that player is leaving
        await fetch(`/api/exquisite-corpse/games/${sessionId}/leave`, {
          method: 'POST',
          headers: {
            'x-player-id': playerId,
          },
        });
      } catch (error) {
        console.error('Failed to notify backend of player leaving:', error);
      }
    }

    // Call the provided leave game handler (which will navigate away)
    onLeaveGame();
  }, [sessionId, playerId, onLeaveGame]);

  // Submit turn to server
  const handleSubmitTurn = useCallback(async (turnData: Omit<CurveTurn, keyof BaseTurn>) => {
    if (!sessionId || !playerId) return;

    try {
      const response = await fetch(`/api/exquisite-corpse/games/${sessionId}/turns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-id': playerId,
        },
        body: JSON.stringify({ turnData, playerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit turn');
      }

    } catch (error) {
      console.error('Failed to submit turn:', error);
      throw error;
    }
  }, [sessionId, playerId]);

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
  if (!isConnected || !gameState) {
    return (
      <div className="flex flex-col gap-4 max-w-[512px] mx-auto p-6">
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <div className="font-semibold">
            {connectionState === 'connecting' ? 'Connecting...' : 'Loading game...'}
          </div>
          {connectionError && (
            <div className="text-red-600 text-sm mt-2">{connectionError}</div>
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
          label="Leave Game"
          onClick={handleLeaveGame}
          className="w-full"
        />
      </div>
    );
  }

  const isActivePlayer = gameState?.players.find(player => player.id === playerId)?.isActive ?? false;
  const currentPlayer = getCurrentPlayer(gameState);

  if (!currentPlayer) {
    throw new Error('No current player, check active player logic');
  }

  const isCurrentPlayer = currentPlayer.id === playerId;

  return (
    <div className="flex flex-col gap-4 max-w-[512px] mx-auto">
      {/* Game Info Header */}
      <div className="p-4 bg-gray-50 rounded-xl flex justify-between">
        {/* Info */}
        <div className="flex-1">
          <div className="font-semibold">Game {sessionId}</div>

          <div className="text-sm space-y-1">
            <div>Type: {gameState.type === 'ai' ? 'AI Game' : 'Multiplayer'}</div>
            <div>Players: {gameState.players.filter(p => p.id !== 'ai').length}</div>
            <div>Your status: {isActivePlayer ? 'Active Player' : 'Viewer'}</div>
            {!isConnected && <div className="text-red-600">Disconnected</div>}
          </div>

          {/* Players List */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-1">Players:</div>
            <div className="flex flex-wrap gap-2">
              {gameState.players.filter(p => p.id !== 'ai').map(player => (
                <span
                  key={player.id}
                  className={`px-2 py-1 rounded text-xs ${player.id === currentPlayer.id
                    ? 'bg-blue-100 text-blue-800'
                    : player.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {player.name}
                  {player.id === playerId && ' (you)'}
                  {isCurrentPlayer && ' ⭐'}
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
      <div className="text-center p-2 bg-deep-50 rounded-xl font-semibold text-deep-600">
        {gameState.status === 'ai_turn_started' && 'AI is drawing...'}
        {gameState.status === 'ai_turn_failed' && (
          <div className="space-y-2">
            <div className="text-red-600">AI turn failed</div>
            <Button
              label="Retry AI Turn"
              onClick={handleRetryAI}
              className="text-sm"
            />
          </div>
        )}
        {gameState.status === 'turn_ended' && isCurrentPlayer && 'Your turn!'}
        {gameState.status === 'turn_ended' && !isCurrentPlayer &&
          `Waiting for ${currentPlayer.name}`}
        {gameState.status === 'game_started' && isCurrentPlayer && 'Start drawing!'}
        {!isActivePlayer && 'Watching game'}
      </div>

      {/* Game Canvas */}
      <MultiplayerCurveTurnRenderer
        handleEndTurn={handleSubmitTurn}
        readOnly={isCurrentPlayer}
        canvasDimensions={dimensions}
        turns={gameState.turns}
        currentTurnIndex={gameState.turns.length}
        currentUserId={playerId}
      />
    </div>
  );
};
