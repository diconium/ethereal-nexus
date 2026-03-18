import { auth } from '@/auth';
import React from 'react';
import { notFound } from 'next/navigation';
import { EVENT_LABELS } from '@/lib/utils';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Activity, Folder, LayoutGrid, Users, Zap } from 'lucide-react';
import { db } from '@/db';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import {
  components as componentsSchema,
  componentVersions,
} from '@/data/components/schema';
import {
  projects as projectsSchema,
  environments,
  projectComponentConfig,
} from '@/data/projects/schema';
import { users as usersSchema } from '@/data/users/schema';
import { members as membersSchema } from '@/data/member/schema';
import { events } from '@/data/events/schema';

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    notFound();
  }

  const userId = session.user.id!;
  const isAdmin = session.user.role === 'admin';

  // --- Stat: all components ---
  const [{ count: componentCount }] = await db
    .select({ count: count() })
    .from(componentsSchema);

  // --- Stat: projects (all for admin, user's for others) ---
  const userProjectIds = isAdmin
    ? undefined
    : (
        await db
          .select({ id: membersSchema.resource })
          .from(membersSchema)
          .where(eq(membersSchema.user_id, userId))
      ).map((r) => r.id);

  const projectsQuery = db.select({ count: count() }).from(projectsSchema);
  const [{ count: projectCount }] = await (!isAdmin &&
  userProjectIds &&
  userProjectIds.length > 0
    ? projectsQuery.where(inArray(projectsSchema.id, userProjectIds))
    : projectsQuery);

  // --- Stat: active deployments in user's projects ---
  // projectComponentConfig -> environment -> project, is_active = true
  const activeDeploymentsQuery = db
    .select({ count: count() })
    .from(projectComponentConfig)
    .innerJoin(
      environments,
      eq(projectComponentConfig.environment_id, environments.id),
    )
    .where(
      !isAdmin && userProjectIds && userProjectIds.length > 0
        ? and(
            eq(projectComponentConfig.is_active, true),
            inArray(environments.project_id, userProjectIds),
          )
        : eq(projectComponentConfig.is_active, true),
    );
  const [{ count: activeDeploymentCount }] = await activeDeploymentsQuery;

  // --- Stat: registered users (admin only) ---
  let userCount: number | null = null;
  if (isAdmin) {
    const [{ count: uc }] = await db
      .select({ count: count() })
      .from(usersSchema);
    userCount = uc;
  }

  // --- Recent activity: last 10 events scoped to user's projects ---
  const recentEvents = await db
    .select({
      id: events.id,
      type: events.type,
      timestamp: events.timestamp,
      resource_id: events.resource_id,
      actor_name: usersSchema.name,
      project_name: projectsSchema.name,
    })
    .from(events)
    .leftJoin(usersSchema, eq(events.user_id, usersSchema.id))
    .leftJoin(projectsSchema, eq(events.resource_id, projectsSchema.id))
    .where(
      !isAdmin && userProjectIds && userProjectIds.length > 0
        ? inArray(events.resource_id, userProjectIds)
        : undefined,
    )
    .orderBy(desc(events.timestamp))
    .limit(10);

  // --- Latest component updates: newest versions of components used in user's projects ---
  // Step 1: get distinct component IDs scoped to user's projects
  const usedComponentsQuery = db
    .selectDistinct({ component_id: projectComponentConfig.component_id })
    .from(projectComponentConfig)
    .innerJoin(
      environments,
      eq(projectComponentConfig.environment_id, environments.id),
    );

  const usedComponents = await (!isAdmin &&
  userProjectIds &&
  userProjectIds.length > 0
    ? usedComponentsQuery.where(
        inArray(environments.project_id, userProjectIds),
      )
    : usedComponentsQuery);

  // Step 2: for each component, get its latest version by created_at
  const usedComponentIds = usedComponents.map((r) => r.component_id);

  const latestVersions =
    usedComponentIds.length === 0
      ? []
      : (
          await db
            .selectDistinctOn([componentVersions.component_id], {
              id: componentVersions.id,
              component_id: componentVersions.component_id,
              version: componentVersions.version,
              created_at: componentVersions.created_at,
              component_name: componentsSchema.name,
            })
            .from(componentVersions)
            .innerJoin(
              componentsSchema,
              eq(componentVersions.component_id, componentsSchema.id),
            )
            .where(inArray(componentVersions.component_id, usedComponentIds))
            .orderBy(
              componentVersions.component_id,
              desc(componentVersions.created_at),
            )
        )
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, 10);

  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Link href="/components" className="flex">
              <Card className="@container/card flex-1 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
                <CardHeader>
                  <CardDescription>Available components</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {componentCount}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <LayoutGrid className="size-3" />
                      All components
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm mt-auto">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Registered in the system <LayoutGrid className="size-4" />
                  </div>
                  <div className="text-muted-foreground">
                    Browse and manage all available components
                  </div>
                </CardFooter>
              </Card>
            </Link>

            <Link href="/projects" className="flex">
              <Card className="@container/card flex-1 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
                <CardHeader>
                  <CardDescription>
                    {isAdmin ? 'Total projects' : 'Your projects'}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {projectCount}
                  </CardTitle>
                  <CardAction>
                    <Badge variant="outline">
                      <Folder className="size-3" />
                      {isAdmin ? 'All projects' : 'My projects'}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm mt-auto">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    {isAdmin
                      ? 'Across the organisation'
                      : 'Projects you are a member of'}{' '}
                    <Folder className="size-4" />
                  </div>
                  <div className="text-muted-foreground">
                    Click to view and manage projects
                  </div>
                </CardFooter>
              </Card>
            </Link>

            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
              <CardHeader>
                <CardDescription>Active deployments</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {activeDeploymentCount}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    <Zap className="size-3" />
                    Live now
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm mt-auto">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  Components currently active <Zap className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Active component configurations across all environments
                </div>
              </CardFooter>
            </Card>

            {isAdmin && (
              <Link href="/users" className="flex">
                <Card className="@container/card flex-1 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
                  <CardHeader>
                    <CardDescription>Registered users</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {userCount}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <Users className="size-3" />
                        All users
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm mt-auto">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Users with platform access <Users className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      Manage user roles and permissions
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            )}
          </div>

          {/* Activity + component updates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4" />
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {recentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-6">
                    No recent activity.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {recentEvents.map((event) => (
                      <li
                        key={event.id}
                        className="flex items-start justify-between gap-2 px-6 py-3"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {EVENT_LABELS[event.type ?? ''] ?? event.type}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {event.project_name
                              ? `${event.project_name} · `
                              : ''}
                            {event.actor_name ?? 'Unknown'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                          {relativeTime(event.timestamp)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="size-4" />
                  Latest component updates
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {latestVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-6">
                    No component updates found.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {latestVersions.map((v) => (
                      <li
                        key={`${v.component_id}-${v.version}`}
                        className="flex items-center justify-between gap-2 px-6 py-3"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/components/${v.component_id}/versions/${v.id}`}
                            className="text-sm font-medium hover:underline truncate"
                          >
                            {v.component_name}
                          </Link>
                          <span className="text-xs text-muted-foreground font-mono">
                            v{v.version}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {relativeTime(v.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
