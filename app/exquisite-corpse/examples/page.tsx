import AdminView from '@/app/components/AdminView';
import { ExampleLoader } from './ExampleLoader';
import { getTrainingExampleService } from '@/app/lib/trainingExampleService';
import { getTagService } from '@/app/lib/tagService';
import { auth } from '@/app/auth';

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

  const {
    items: examples,
    totalPages,
  } = await getTrainingExampleService().getExamples(page, 12, tags);

  const session = await auth();
  const allTags = await getTagService().getTags(session);

  return (
    <AdminView>
      <ExampleLoader
        initialState={{
          examples,
          allTags,
          page,
          perPage: 12,
          totalPages,
          tags,
        }}
      />
    </AdminView>
  );
}
