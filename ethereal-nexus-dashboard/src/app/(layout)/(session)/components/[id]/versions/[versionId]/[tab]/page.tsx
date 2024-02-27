import {Separator} from '@/components/ui/separator';
import {notFound} from 'next/navigation';
import {getComponentAssets, getComponentById, getComponentVersions} from "@/data/components/actions";
import React from "react";
import ComponentVersionHeader from "@/components/components/component/version/header";
import ComponentVersionTabs from "@/components/components/component/version/tabs";


export default async function EditComponentVersion({params: {id, versionId, tab}}: any) {

    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const componentAssets = await getComponentAssets(id,versionId);
    if (!versions.success || !component.success || !componentAssets.success) {
        notFound();
    }
    const selectedVersion = versions.data.filter((version: any) => version.id === versionId)[0];
    return (
        <div className="container space-y-6">
            <ComponentVersionHeader versions={versions} component={component}
                                    selectedVersion={selectedVersion} activeTab={tab}/>
            <Separator/>
            <ComponentVersionTabs activeTab={tab} versions={versions} selectedVersion={selectedVersion} component={component} componentAssets={componentAssets}/>
        </div>
    );
}
