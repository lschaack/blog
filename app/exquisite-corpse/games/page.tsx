import AdminView from '@/app/components/AdminView';
import { GameLoader } from './GameLoader';
import { getGameService } from '@/app/lib/gameService';

export default async function WithAdminView({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: requestedPage } = await searchParams;
  const page = requestedPage ? parseInt(requestedPage) : 1;
  const perPage = 12;

  const {
    items: games,
    totalItems,
    totalPages,
  } = await getGameService().getGames(page, perPage);

  return (
    <AdminView>
      <GameLoader
        initialState={{
          games,
          page,
          perPage,
          totalPages,
          totalItems,
        }}
      />
    </AdminView>
  );
}

