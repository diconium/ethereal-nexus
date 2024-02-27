import {getComponentAssets, getComponentById, getComponentVersions} from "@/data/components/actions";
import PreviewContainer from "@/components/components/component/version/preview-container";

export default async function PreviewVersion({params: {id, versionId}}: any) {


    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const selectedVersion = versions.data.filter((version: any) => version.id === versionId)[0];

    const componentAssets = await getComponentAssets(id, versionId);

    return (<PreviewContainer component={component} selectedVersion={selectedVersion} key={versionId} componentSlug={component.data.slug}
                              componentAssets={componentAssets.data}></PreviewContainer>);
}
