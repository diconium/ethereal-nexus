import React from 'react';
import {Separator} from '@/components/ui/separator';
import {notFound} from 'next/navigation';
import {
    getComponentById,
    getComponentDependentsProjectsWithOwners,
    getComponentVersions
} from "@/data/components/actions";
import ComponentVersionHeader from "@/components/components/component/version/header";
import ComponentVersionTabs from "@/components/components/component/version/tabs";
import {auth} from "@/auth";
import {getMembersByResourceId, getComponentEvents} from "@/data/member/actions";

export default async function EditComponentVersion({params: {id, versionId, tab}}: any) {
    const session = await auth()

    const component = await getComponentById(id);
    const versions = await getComponentVersions(id);
    const dependents = await getComponentDependentsProjectsWithOwners(id);
    const events = await getComponentEvents(id);
    const projects = await getComponentDependentsProjectsWithOwners(id);

    if (projects.success) {
        projects.data = await Promise.all(
            projects.data.map(async (project) => {
                const membersData = await getMembersByResourceId(project.id, session?.user?.id);
                const userHasAccess = (membersData.success && membersData.data.some(member => member.user_id == session?.user?.id));

                return {
                    ...project,
                    userHasAccess
                };
            })
        );
    }

    if (!versions.success || !component.success || !projects.success) {
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
                                  component={component} dependents={projects.data} events={events.data}/>
        </div>
    );
}
