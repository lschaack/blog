"use client";

import { useCallback } from 'react';
import { useRouter } from "next/navigation";

import { useSSEConnection } from './useSSEConnection';
import { leaveGame } from './requests';
import { ActiveSession, GameSessionProps } from './ActiveSession';
import { ConnectionErrorRecovery } from './ConnectionErrorRecovery';

export const MultiplayerGameSession = ({
  sessionId,
  playerName,
  dimensions,
}: GameSessionProps) => {
  const SSEConnection = useSSEConnection(sessionId);
  const {
    connectionState,
    gameState,
    error,
  } = SSEConnection;

  const router = useRouter();

  const handleLeaveGame = useCallback(() => {
    // dunno why this would fail, but nothing much to do about it
    leaveGame(sessionId).catch();

    router.push('/exquisite-corpse');
  }, [sessionId, router]);

  if (connectionState !== 'connected' || !gameState) {
    if (error) {
      return (
        <ConnectionErrorRecovery
          error={error}
          // TODO: not too much I can do here, but there's definitely something...
          updateError={() => undefined}
          sessionId={sessionId}
          playerName={playerName}
        />
      );
    } else {
      return (
        <div className="font-semibold text-2xl [font-variant:all-small-caps]">
          {connectionState}
        </div>
      );
    }
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
