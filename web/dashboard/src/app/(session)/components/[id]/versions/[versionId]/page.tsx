import { redirect } from 'next/navigation';


export default async function EditComponentVersion(props: any) {
  const {
    id, versionId
  } = await props.params;

  redirect(`/components/${id}/versions/${versionId}/readme`);
}
