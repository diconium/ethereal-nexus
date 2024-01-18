import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RecentComponents from '@/components/dashboard/recent-components';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';

export default async function Home() {
    const session = await auth()
    const projects = await getProjects(session?.user?.id);

    return <div className="container flex-col md:flex">
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics" disabled>
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="reports" disabled>
                        Reports
                    </TabsTrigger>
                    <TabsTrigger value="notifications" disabled>
                        Notifications
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 p-6">
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

                    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight pt-8">
                        Components
                    </h3>
                    <div className="flex flex-row justify-between gap-8 ">
                        <Card className="flex-4">
                            <CardHeader>
                                {/* eslint-disable-next-line react/no-unescaped-entities */}
                                <CardTitle>Component's activity</CardTitle>
                                <CardDescription>
                                    12 components were updated this month.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RecentComponents />
                            </CardContent>
                        </Card>
                        <div className="flex-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Most used components</CardTitle>
                                    <CardDescription>
                                        Check here the list of the 10 most used components.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="leading-7 [&:not(:first-child)]:mt-6">
                                        This feature will be available in the next release.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4"></TabsContent>
                <TabsContent value="reports" className="space-y-4"></TabsContent>
                <TabsContent
                  value="notifications"
                  className="space-y-4"
                ></TabsContent>
            </Tabs>
        </div>
    </div>;
}
