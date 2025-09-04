import { cookies } from 'next/headers';
import { MultiplayerGameSession } from '../MultiplayerGameSession';
import Link from 'next/link';
import { SESSION_ID_MATCHER } from '../sessionId';

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

  const dimensions = { width: 512, height: 512 };

  let error: string;
  if (!SESSION_ID_MATCHER.test(sessionId)) {
    error = `${sessionId} is not a valid session ID`;
  } else if (!playerNameParam && !cookieStore.has('playerName')) {
    error = 'No player ID found, please use join game flow';
  } else {
    error = '';
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Game Session Error</h1>
          <p className="text-gray-600">{sessionId} is not a valid session ID</p>
        </div>
        <Link
          href="/exquisite-corpse"
          className="w-full"
        >
          Return to lobby
        </Link>
      </div>
    );
  }

  const playerNameCookie = cookieStore.get('playerName')!;

  return (
    <MultiplayerGameSession
      sessionId={sessionId}
      playerName={playerNameParam ?? playerNameCookie.value}
      dimensions={dimensions}
    />
  );
}

