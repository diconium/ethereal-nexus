import { getProjectById } from "@/lib/projects/projects.service";
import { Separator } from "@/components/ui/separator";
import ProjectsForm from "@/components/projects/project-form";
import { getAllDistinctComponents } from "@/lib/components/components.service";
import { Project } from "@/app/api/v1/projects/model";

const getData = async (id: string) => {
  let project: Project | null = null;
  if (id !== "0") {
    project = await getProjectById(id);
  }
  const allComponents = await getAllDistinctComponents();
  return {
    project,
    allComponents,
  };
};

export default async function EditProject({ params }: any) {
  const { id } = params;
  const { project, allComponents } = await getData(id);
  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Projects</h3>
        <p className="text-sm text-muted-foreground">
          {project?.name
            ? `Update project ${project?.name}`
            : `Create a new project`}
        </p>
      </div>
      <Separator />
      <ProjectsForm
        id={id}
        project={project}
        availableComponents={allComponents}
      />
    </div>
  );
}
