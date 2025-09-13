import { CreateGameForm } from '../CreateGameForm';
import { GameTypeSelector } from './GameTypeSelector';

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type: gameType } = await searchParams;

  if (!gameType || (gameType !== 'singleplayer' && gameType !== 'multiplayer')) {
    return <GameTypeSelector />;
  } else {
    return <CreateGameForm gameType={gameType} />;
  }
}
