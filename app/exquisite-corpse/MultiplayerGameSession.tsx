"use client";

import { useCallback } from 'react';
import { useRouter } from "next/navigation";

import { useSSEConnection } from './useSSEConnection';
import { Button } from '@/app/components/Button';
import { leaveGame } from './requests';
import { ActiveSession, GameSessionProps } from './ActiveSession';

export const MultiplayerGameSession = ({
  sessionId,
  playerName,
  dimensions,
}: GameSessionProps) => {
  const SSEConnection = useSSEConnection(sessionId);
  const {
    connectionState,
    gameState,
    reconnect,
    error: connectionError,
  } = SSEConnection;

  const router = useRouter();

  const handleLeaveGame = useCallback(() => {
    leaveGame(sessionId);

    router.push('/exquisite-corpse');
  }, [sessionId, router]);

  // FIXME: !playerName error message
  if (connectionState !== 'connected' || !gameState || !playerName) {
    return (
      <div className="flex flex-col gap-4 max-w-[512px] mx-auto p-6">
        <div className="card text-center">
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
  } else {
    return (
      <ActiveSession
        sessionId={sessionId}
        playerName={playerName}
        dimensions={dimensions}
        gameState={gameState}
        handleLeaveGame={handleLeaveGame}
      />
    )
  }
}
