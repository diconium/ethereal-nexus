import {getComponentAssets, getComponentById, getComponentVersions} from "@/data/components/actions";
import PreviewContainer from "@/components/components/component/version/preview-container";
import { DialogField } from '@ethereal-nexus/dialog-ui-core';
import {notFound} from "next/navigation";

export const revalidate = 0;
export default async function PreviewVersion(props: any) {
    const {
        id,
        versionId
    } = await props.params;

    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const componentAssets = await getComponentAssets(id, versionId);
    if (!versions.success || !component.success || !componentAssets.success) {
        notFound();
    }
    const selectedVersionRaw = versions.data.find((version: any) => version.id === versionId);
    if (!selectedVersionRaw) {
        notFound();
    }

    const selectedVersion: any = {
        ...selectedVersionRaw,
        // ensure dialog is either an array of DialogField or undefined to match PreviewContainerProps
        dialog: Array.isArray(selectedVersionRaw?.dialog)
            ? (selectedVersionRaw.dialog as DialogField[])
            : undefined,
    };

    return (
        <PreviewContainer
            component={component}
            selectedVersion={selectedVersion}
            key={versionId}
            componentSlug={component.data.slug}
            componentAssets={componentAssets.data}
        />
    );
}
