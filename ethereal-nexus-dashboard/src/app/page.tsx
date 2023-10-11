"use client";
import {Tabs} from "@radix-ui/react-tabs";
import {TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import Link from "next/link";
import RecentComponents from "@/components/dashboard/recent-components";
import {useEffect, useState} from "react";
import {project} from "types-ramda";
import {Project} from "@/app/api/v1/projects/model";
import {useRouter} from "next/navigation";

export default function Home() {
    const [data, setData] = useState([]);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/v1/projects")
            .then((response) => response.json())
            .then((data) => {
                setData(data);
            });
    }, []);

    const edit = async (project: Project) => {
        router.push(`/projects/${project._id.toString()}`);
        router.refresh();
    };

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
                    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Projects
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {data.slice(0, 5).map((project: Project )=> {
                            return <Card key={project._id} className="cursor-pointer"
                                      onClick={() => edit(project)}>
                                    <CardHeader
                                        className="flex flex-row items-center justify-between space-y-0 pb-2"></CardHeader>
                                    <CardContent>
                                        <CardTitle className="text-sm font-medium">
                                            {project.components && project.components.length > 1 ? `${project.components.length} components` : '1 component'}
                                        </CardTitle>
                                        <div className="text-2xl font-bold">{project.name}</div>
                                        <p className="text-xs text-muted-foreground">
                                            {project.description}
                                        </p>
                                    </CardContent>
                                </Card>
                        })}
                    </div>
                    <div className="flex flex-row w-full flex justify-end items-end ">
                        <Button asChild>
                            <Link href="/projects">See all projects</Link>
                        </Button>
                    </div>
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
                                <RecentComponents/>
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
