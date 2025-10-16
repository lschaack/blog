import AdminView from '@/app/components/AdminView';
import { ErrorCard } from '@/app/components/ErrorCard';
import { getTrainingExampleService } from '@/app/lib/trainingExampleService';
import { TrainingInterface } from '../../TrainingInterface';
import { auth } from '@/app/auth';
import { getTagService } from '@/app/lib/tagService';

type ExampleViewerProps = {
  exampleId: string;
}

async function ExampleViewer({ exampleId }: ExampleViewerProps) {
  const session = await auth();
  const [example, tags] = await Promise.all([
    getTrainingExampleService().getExample(exampleId),
    getTagService().getTags(session),
  ]);

  if (!example) {
    return <ErrorCard error={{ message: "Couldn't find a training example with that ID" }} />
  } else {
    return <TrainingInterface tags={tags} source={example} />
  }
}

export default async function WithAdminView({
  params,
}: {
  params: Promise<{ exampleId: string }>,
}) {
  const { exampleId } = await params;

  return (
    <AdminView>
      <ExampleViewer exampleId={exampleId} />
    </AdminView>
  )
}
