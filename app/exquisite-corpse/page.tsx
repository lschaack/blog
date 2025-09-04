"use client";

import { useRouter } from 'next/navigation';
import { GameLobby } from './GameLobby';

export default function ExquisiteCorpsePage() {
  const router = useRouter();

  const handleGameJoined = (sessionId: string, playerName: string) => {
    router.push(`/exquisite-corpse/${sessionId}?playerName=${playerName}`);
  };

  return <GameLobby onGameJoined={handleGameJoined} />;
}
