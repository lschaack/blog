import AdminView from '@/app/components/AdminView';
import { GameBrowser } from './GameBrowser';

export default async function WithAdminView({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: requestedPage } = await searchParams;
  const page = requestedPage ? parseInt(requestedPage) : 1;

  return (
    <AdminView>
      <GameBrowser page={page} />
    </AdminView>
  )
}

