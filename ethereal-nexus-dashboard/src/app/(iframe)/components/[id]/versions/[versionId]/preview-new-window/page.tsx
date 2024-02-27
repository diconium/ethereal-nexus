import {getComponentAssets, getComponentById, getComponentVersions} from "@/data/components/actions";
import PreviewContainer from "@/components/components/component/version/preview-container";
import {notFound} from "next/navigation";

export const revalidate = 0;
export default async function PreviewVersion({params: {id, versionId}}: any) {


    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const componentAssets = await getComponentAssets(id, versionId);
    if (!versions.success || !component.success || !componentAssets.success) {
        notFound();
    }
    const selectedVersion = versions.data.filter((version: any) => version.id === versionId)[0];


    return (<PreviewContainer
        component={component}
        selectedVersion={selectedVersion}
        key={versionId}
        componentSlug={component.data.slug}
        componentAssets={componentAssets.data}/>);
}
