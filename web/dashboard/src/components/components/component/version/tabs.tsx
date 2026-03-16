'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Preview from '@/components/components/component/version/tabs/preview';
import { useRouter } from 'next/navigation';
import Readme from '@/components/components/component/version/tabs/readme';
import Dependents from '@/components/components/component/version/tabs/dependents';
import ProjectEventsClient from '@/components/projects/project-events/ProjectEventsClient';
import Versions from '@/components/components/component/version/tabs/versions';

const ComponentVersionTabs = ({
  activeTab,
  component,
  versions,
  selectedVersion,
  dependents,
  assets,
}) => {
  const { push } = useRouter();

  return (
    <Tabs
      defaultValue={activeTab}
      onValueChange={(tab) =>
        push(
          `/components/${component.data.id}/versions/${selectedVersion.id}/${tab}`,
        )
      }
    >
      <TabsList className="mb-6">
        <TabsTrigger value="readme">Readme</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="dependents">Dependents</TabsTrigger>
        <TabsTrigger value="versions">Versions</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="readme">
        <Readme selectedVersion={selectedVersion} assets={assets} />
      </TabsContent>
      <TabsContent value="preview">
        <Preview
          key={selectedVersion.id}
          componentId={component.data.id}
          selectedVersionId={selectedVersion.id}
        />
      </TabsContent>
      <TabsContent value="dependents">
        <Dependents dependents={dependents} />
      </TabsContent>
      <TabsContent value="versions">
        <Versions
          versions={versions.data}
          componentId={component.data.id}
          selectedVersionId={selectedVersion.id}
        />
      </TabsContent>
      <TabsContent value="activity">
        <ProjectEventsClient
          id={component.data.id}
          hideComponentColumn={true}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ComponentVersionTabs;
