import { FC, useCallback } from 'react';
import { useRouter } from "next/navigation";

import { Button } from '@/app/components/Button';
import { joinGame, leaveGame } from './requests';
import { ConnectionError, DEFAULT_CONNECTION_ERROR, extractConnectionError } from '../lib/connectionError';

const RecoveryOptions: FC<ConnectionErrorRecoveryProps> = ({
  error,
  updateError,
  sessionId,
  playerName,
}) => {
  const router = useRouter();

  const reconnect = useCallback(
    () => router.push(`/exquisite-corpse/${sessionId}`),
    [router, sessionId]
  );

  switch (error.code) {
    case 403001:
    case 403002:
    case 404002: {
      const params = new URLSearchParams({ sessionId });

      if (playerName) params.append('playerName', playerName);

      return (
        <Button
          label="Join Game"
          onClick={() => router.push(`/exquisite-corpse/join?${params.toString()}`)}
        />
      );
    }
    case 403003:
    case 404001: {
      return (
        <Button
          label="Create new game"
          onClick={() => router.push('/exquisite-corpse/new')}
        />
      );
    }
    case 409001: {
      const params = new URLSearchParams({ sessionId });

      return (
        <Button
          label="Try a different name"
          onClick={() => {
            router.push(`/exquisite-corpse/join?${params.toString()}`)
            updateError(null);
          }}
        />
      );
    }
    case 409002: {
      return (
        <Button
          label={`Reconnect as "${playerName}"`}
          onClick={reconnect}
        />
      );
    }
    case 409003: {
      return (
        <>
          <Button
            label="Reconnect"
            onClick={reconnect}
          />
          <Button
            label={`Leave and join as "${playerName}"`}
            onClick={() => {
              leaveGame(sessionId)
                .then(res => { if (!res.ok) throw res })
                .then(() => joinGame(sessionId, playerName))
                .then(res => { if (!res.ok) throw res })
                .then(() => router.push(`/exquisite-corpse/${sessionId}`))
                .catch(error => {
                  if (error instanceof Response) {
                    extractConnectionError(error).then(updateError)
                  } else {
                    updateError(DEFAULT_CONNECTION_ERROR);
                  }
                })
            }}
          />
        </>
      );
    }
    case 500001:
    default: {
      return null; // irrecoverable
    }
  }
}

type ConnectionErrorRecoveryProps = {
  error: ConnectionError;
  // sometimes error recovery results in a new error...ain't that just the way
  updateError: (error: ConnectionError | null) => void;
  sessionId: string;
  playerName: string;
}
export const ConnectionErrorRecovery: FC<ConnectionErrorRecoveryProps> = ({
  error,
  updateError,
  sessionId,
  playerName,
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 max-w-[512px]">
      <div className="card text-center">
        <div className="font-semibold text-2xl [font-variant:all-small-caps]">
          Error
        </div>
        <div className="text-red-600 font-semibold font-geist-mono mt-2 max-w-[30ch]">
          {error.message}
        </div>
      </div>

      <RecoveryOptions
        error={error}
        updateError={updateError}
        sessionId={sessionId}
        playerName={playerName}
      />

      <Button
        label="Return to Lobby"
        onClick={() => router.push('/exquisite-corpse')}
      />
    </div>
  );
}
