"use client";
import React from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Preview from "@/components/components/component/version/tabs/preview";
import {useRouter} from "next/navigation";
import Readme from "@/components/components/component/version/tabs/readme";
import Dependents from "@/components/components/component/version/tabs/dependents";
import Events from "@/components/components/component/version/tabs/events";

const ComponentVersionTabs = ({activeTab, component, versions, selectedVersion, dependents, events}) => {
    const {push} = useRouter();

    return (
        <Tabs defaultValue={activeTab}
              onValueChange={(tab) => push(`/components/${component.data.id}/versions/${selectedVersion.id}/${tab}`)}>
            <TabsList className={"mb-6"}>
                <TabsTrigger value="readme">Readme</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="dependents">Dependents</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="readme">
                <Readme selectedVersion={selectedVersion}/>
            </TabsContent>
            <TabsContent value="preview">
                <Preview key={selectedVersion.id} componentId={component.data.id}
                         selectedVersionId={selectedVersion.id}/>
            </TabsContent>
            <TabsContent value="dependents">
              <Dependents dependents={dependents}/>
            </TabsContent>
            <TabsContent value="versions">
                <ul role="list" className="divide-y divide-gray-100">
                    {versions.data.map((version: any, index) => (
                        <li key={index} className="flex justify-between gap-x-6 py-5">
                            <div className="flex min-w-0 gap-x-4">
                                <div className="min-w-0 flex-auto">
                                    <p className="text-sm font-semibold leading-6 text-gray-900">
                                        {version.version}</p>
                                    <p className="mt-1 truncate text-xs leading-5 text-gray-500">60,000
                                        Downloads</p>
                                </div>
                            </div>
                            <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                                <p className="text-sm leading-6 text-gray-900">Published</p>
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    <time
                                        dateTime={version.created_at}>{version.created_at.toLocaleString('en-US', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</time>
                                </p>
                            </div>
                        </li>))}
                </ul>
            </TabsContent>
            <TabsContent value="activity">
                <Events events={events.data} isComponentView={true} components={[]} members={[]}></Events>
            </TabsContent>
        </Tabs>
    );
};

export default ComponentVersionTabs;
