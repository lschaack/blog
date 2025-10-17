import AdminView from "@/app/components/AdminView";
import { TrainingInterface } from "../../TrainingInterface";
import { auth } from "@/app/auth";
import { getTagService } from "@/app/lib/tagService";

async function TrainingInterfaceDataLoader() {
  const session = await auth();
  const tags = await getTagService().getTags(session);

  return <TrainingInterface tags={tags} />;
}

export default function Train() {
  return (
    <AdminView>
      <TrainingInterfaceDataLoader />
    </AdminView>
  );
}
