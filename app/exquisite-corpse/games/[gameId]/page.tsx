import AdminView from '@/app/components/AdminView';
import { ErrorCard } from '@/app/components/ErrorCard';
import { prisma } from '@/app/lib/prisma';
import { MultiplayerGameState } from '@/app/types/multiplayer';
import { GameView } from './GameView';

type GameViewerProps = {
  gameId: string;
}
async function GameViewer({ gameId }: GameViewerProps) {
  const game = await prisma.exquisiteCorpseGame.findFirst({ where: { id: gameId } });

  if (!game) {
    return <ErrorCard error={{ message: "Couldn't find a game with that ID" }} />
  } else if (!game.data) {
    return <ErrorCard error={{ message: "That game exists, but has no data. Bizarre." }} />
  } else {
    return <GameView gameData={game.data as MultiplayerGameState} />
  }
}

export default async function WithAdminView({
  params,
}: {
  params: Promise<{ gameId: string }>,
}) {
  const { gameId } = await params;

  return (
    <AdminView>
      <GameViewer gameId={gameId} />
    </AdminView>
  )
}

