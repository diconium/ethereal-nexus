import {redirect} from 'next/navigation';
import {getComponentVersions} from "@/data/components/actions";


export default async function EditComponent({params: {id}}: any) {

    const versions = await getComponentVersions(id);
    redirect(`/components/${id}/versions/${versions.data[0].id}`);
}
