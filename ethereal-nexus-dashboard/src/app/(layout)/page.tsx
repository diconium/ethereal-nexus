import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { logger } from "@/logger"; // our logger import

export default async function Home() {
    const session = await auth()
    const projects = await getProjects(session?.user?.id);


    return <div className="flex-col md:flex">
        <div className="flex-1 space-y-4 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
            {projects.success && projects.data.length > 0 ? <>  <h3
              className="scroll-m-20 text-2xl font-semibold tracking-tight">
                Projects
            </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {projects.data.slice(0, 5).map((project) => {
                        return <Link key={project.id} href={`/projects/${project.id}`}>
                            <Card className="cursor-pointer">
                                <CardHeader
                                  className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {project.components.length === 1 ? '1 component' : `${project.components.length} components`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{project.name}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {project.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>;
                    })}
                </div>
                <div className="flex flex-row w-full justify-end items-end ">
                    <Button asChild>
                        <Link href="/projects">See all projects</Link>
                    </Button>
                </div>
            </> : null}
        </div>
    </div>;
}
