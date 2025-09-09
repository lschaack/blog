"use client";

import { useRouter } from 'next/navigation';
import { GameLobby } from './GameLobby';

export default function ExquisiteCorpsePage() {
  const router = useRouter();

  const handleGameJoined = (sessionId: string) => {
    router.push(`/exquisite-corpse/${sessionId}`);
  };

  return <GameLobby onGameJoined={handleGameJoined} />;
}
