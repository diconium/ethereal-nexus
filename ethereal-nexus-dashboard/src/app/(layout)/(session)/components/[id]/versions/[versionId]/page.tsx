import {redirect} from 'next/navigation';


export default async function EditComponentVersion({params: {id, versionId}}: any) {
    redirect(`/components/${id}/versions/${versionId}/readme`);
}
