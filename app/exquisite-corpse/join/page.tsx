"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { JoinGameForm } from '../JoinGameForm';

export default function JoinGamePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get('sessionId') ?? undefined;
  const playerName = searchParams.get('playerName') ?? undefined;

  const handleGameJoined = (sessionId: string) => {
    router.push(`/exquisite-corpse/${sessionId}`);
  };

  return (
    <JoinGameForm
      onBack={router.back}
      onGameJoined={handleGameJoined}
      initSessionId={sessionId}
      initPlayerName={playerName}
    />
  );
}
