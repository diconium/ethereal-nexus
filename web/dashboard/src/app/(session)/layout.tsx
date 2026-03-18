import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn } from '@/auth';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/sidebar/app-sidebar';
import { SiteHeader } from '@/components/ui/sidebar/site-header';
import { HeaderSlotProvider } from '@/components/ui/sidebar/header-slot-context';
import { ProjectProvider } from '@/lib/project-context';
import { Toaster } from '@/components/ui/sonner';

const navigation = [
  {
    title: 'All Components',
    url: '/components',
    icon: 'LayoutGrid',
  },
  {
    title: 'Users',
    url: '/users',
    icon: 'UserRound',
    role: 'admin',
  },
];

export default async function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    return await signIn();
  }

  const authorizedNavigation = navigation.filter((item) => {
    if (!item.role) {
      return true;
    }
    return session.user?.role === item.role;
  });

  return (
    <ProjectProvider>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          user={session.user}
          navigation={authorizedNavigation}
        />
        <SidebarInset>
          <HeaderSlotProvider>
            <SiteHeader />
            <div className="flex flex-1 flex-col p-4 lg:p-6">
              <SessionProvider session={session}>{children}</SessionProvider>
            </div>
          </HeaderSlotProvider>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </ProjectProvider>
  );
}
