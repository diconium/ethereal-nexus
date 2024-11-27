import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn } from '@/auth';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/sidebar/app-sidebar';
import { Toaster } from '@/components/ui/toaster';


const navigation = [
  {
    title: 'Dashboard',
    url: '/',
    icon: "LayoutDashboard",
    isActive: true
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: "Folder"
  },
  {
    title: 'Components',
    url: '/components',
    icon: "LayoutGrid"
  },
  {
    title: 'Users',
    url: '/users',
    icon: "UserRound",
    role: 'admin'
  }
];

export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    return await signIn();
  }

  const authorizedNavigation = navigation
    .filter(item => {
      if (!item.role) {
        return true;
      }

      return session.user?.role === item.role;
    });

  return (
    <SidebarProvider>
      <AppSidebar
        className="p-0"
        user={session.user}
        navigation={authorizedNavigation}
      />
      <main className="container mx-auto">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </main>
      <Toaster />
    </SidebarProvider>
  );
}
