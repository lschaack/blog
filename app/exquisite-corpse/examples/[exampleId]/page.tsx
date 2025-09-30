import AdminView from '@/app/components/AdminView';
import { ErrorCard } from '@/app/components/ErrorCard';
import { getTrainingExampleService } from '@/app/lib/trainingExampleService';
import { ExampleView } from './ExampleView';

type ExampleViewerProps = {
  exampleId: string;
}

async function ExampleViewer({ exampleId }: ExampleViewerProps) {
  const example = await getTrainingExampleService().getExample(exampleId);

  if (!example) {
    return <ErrorCard error={{ message: "Couldn't find a training example with that ID" }} />
  } else {
    return <ExampleView exampleData={example} />
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