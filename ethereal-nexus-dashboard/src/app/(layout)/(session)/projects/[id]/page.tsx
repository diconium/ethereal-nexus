import { Separator } from '@/components/ui/separator';
import ProjectsForm from '@/components/projects/project-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjectById } from '@/data/projects/actions';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { ProjectComponentsList } from '@/components/projects/component-selection-table/components-list';
import Link from 'next/link';

export default async function EditProject({ params: { id }, searchParams: { tab } }: any) {
  const session = await auth();
  const project = await getProjectById(id, session?.user?.id);

  if (!project.success) {
    notFound();
  }

  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Projects</h3>
        <p className="text-sm text-muted-foreground">
          {project.data.name
            ? `Update project ${project.data.name}`
            : `Create a new project`}
        </p>
      </div>
      <Separator />
      <Tabs value={tab} defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Link href={`/projects/${id}?tab=overview`} >
              Overview
            </Link>
          </TabsTrigger>
          <TabsTrigger value="components">
            <Link href={`/projects/${id}?tab=components`} >
              Components
            </Link>
          </TabsTrigger>
          <TabsTrigger value="users">
            <Link href={`/projects/${id}?tab=users`} >
              Users
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 p-6">
          <ProjectsForm
            project={project.data}
          />
        </TabsContent>
        <TabsContent value="components" className="space-y-4 p-6">
          <ProjectComponentsList
            id={id}
          />
        </TabsContent>
        <TabsContent value="users" className="space-y-4 p-6">
          <ProjectMemberList
            id={id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
