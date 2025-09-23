import { cookies } from 'next/headers';
import { MultiplayerGameSession } from '../MultiplayerGameSession';

export default async function GameSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>,
  searchParams: Promise<{ playerName?: string }>
}) {
  const { sessionId } = await params;
  const { playerName: playerNameParam } = await searchParams;
  const cookieStore = await cookies();

  const playerNameCookie = cookieStore.get('clientPlayerName')!;

  return (
    <MultiplayerGameSession
      sessionId={sessionId}
      playerName={playerNameParam ?? playerNameCookie?.value}
    />
  );
}

