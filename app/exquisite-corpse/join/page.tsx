import { JoinGameForm } from '../JoinGameForm';

export default async function JoinGamePage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; playerName?: string; }>
}) {
  const {
    sessionId,
    playerName,
  } = await searchParams;

  return (
    <JoinGameForm
      initSessionId={sessionId}
      initPlayerName={playerName}
    />
  );
}
