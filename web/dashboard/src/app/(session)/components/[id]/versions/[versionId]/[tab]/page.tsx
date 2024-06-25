import {Separator} from '@/components/ui/separator';
import {notFound} from 'next/navigation';
import {
    getComponentAssets,
    getComponentById,
    getComponentDependentsProjectsWithOwners,
    getComponentVersions
} from "@/data/components/actions";
import React from "react";
import ComponentVersionHeader from "@/components/components/component/version/header";
import ComponentVersionTabs from "@/components/components/component/version/tabs";
import {getComponentEvents} from "@/data/events/actions";


export default async function EditComponentVersion({params: {id, versionId, tab}}: any) {

    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const dependents = await getComponentDependentsProjectsWithOwners(id);
    const events = await getComponentEvents(id);

    if (!versions.success || !component.success || !dependents.success) {
        notFound();
    }
    const selectedVersion = versions.data.filter((version: any) => version.id === versionId)[0];
    return (
        <div className="container space-y-6">
            <ComponentVersionHeader versions={versions} component={component}
                                    selectedVersion={selectedVersion} activeTab={tab}/>
            <Separator/>
            <ComponentVersionTabs activeTab={tab} versions={versions} selectedVersion={selectedVersion}
                                  component={component} dependents={dependents.data} events={events.data}/>
        </div>
    );
}
