"use client";

import { useRouter } from 'next/navigation';
import { GameLobby } from './GameLobby';

export default function ExquisiteCorpsePage() {
  const router = useRouter();

  const handleGameJoined = (sessionId: string, playerId: string, isActive: boolean) => {
    // Navigate to the game session with the player data in the URL
    const searchParams = new URLSearchParams({
      playerId,
      isActive: isActive.toString()
    });

    router.push(`/exquisite-corpse/${sessionId}?${searchParams.toString()}`);
  };

  return <GameLobby onGameJoined={handleGameJoined} />;
}
