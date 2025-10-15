import AdminView from '@/app/components/AdminView';
import { ExampleBrowser } from './ExampleBrowser';

export default async function WithAdminView({
  searchParams,
}: {
  searchParams: Promise<{ page?: string, tags?: string }>
}) {
  const { page: requestedPage, tags: rawTags } = await searchParams;
  const page = requestedPage ? parseInt(requestedPage) : 1;

  const tags = rawTags
    ?.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return (
    <AdminView>
      <ExampleBrowser page={page} perPage={12} tagFilter={tags} />
    </AdminView>
  );
}
