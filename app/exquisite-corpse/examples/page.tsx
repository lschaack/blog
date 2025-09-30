import AdminView from '@/app/components/AdminView';
import { ExampleBrowser } from './ExampleBrowser';

export default async function WithAdminView({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: requestedPage } = await searchParams;
  const page = requestedPage ? parseInt(requestedPage) : 1;

  return (
    <AdminView>
      <ExampleBrowser page={page} perPage={12} />
    </AdminView>
  );
}