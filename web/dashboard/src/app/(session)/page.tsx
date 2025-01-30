import { auth } from '@/auth';
import React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Folder, LayoutGrid } from 'lucide-react';
import { db } from '@/db';
import { count } from 'drizzle-orm';
import { components as componentsSchema } from '@/data/components/schema';
import { projects as projectsSchema } from '@/data/projects/schema';
import { userIsMember } from '@/data/member/actions';

export default async function Home() {
  const session = await auth();

  if(!session?.user) {
    notFound()
  }

  const components = await db
    .select({ count: count() })
    .from(componentsSchema);

  const projects = await db
    .select({ count: count() })
    .from(projectsSchema)
    .where(
      session.user.role !== 'admin' ?
        await userIsMember(session.user?.id || '') :
        undefined
    );

  console.log(components)
  return (
    <article className="grid md:grid-cols-4 gap-x-6 gap-y-6 md:gap-y-16">
      <h1 className="text-4xl md:col-span-4">Hi, {session.user.name}</h1>
        <Link href="/components">
          <Card className="border-black-10 bg-white dark:border-black-60 dark:bg-black-80">
            <CardHeader>
              <CardTitle className="font-normal">Available components</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
            <span className="p-2 rounded-xl border text-black-80 dark:text-white border-black-10 bg-black-05 dark:border-black-60 dark:bg-black-90">
              <LayoutGrid color="currentColor"/>
            </span>
              <span className="text-4xl font-semibold text-orange-120">
              {components[0].count}
            </span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/projects">
          <Card className="border-black-10 bg-white dark:border-black-60 dark:bg-black-80">
            <CardHeader>
              <CardTitle className="font-normal">Available projects</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
            <span className="p-2 rounded-xl border text-black-80 dark:text-white border-black-10 bg-black-05 dark:border-black-60 dark:bg-black-90">
                <Folder color="currentColor"/>
              </span>
              <span className="text-4xl font-semibold text-orange-120">
                {projects[0].count}
              </span>
            </CardContent>
          </Card>
        </Link>
    </article>
  );
}
