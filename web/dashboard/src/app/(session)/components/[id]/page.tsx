import { notFound, redirect } from 'next/navigation';
import { getComponentVersions } from '@/data/components/actions';


export default async function EditComponent(props: any) {
  const {
    id
  } = await props.params;

  const versions = await getComponentVersions(id);
  if (!versions.success) {
    notFound();
  }
  redirect(`/components/${id}/versions/${versions.data[0].id}`);
}
