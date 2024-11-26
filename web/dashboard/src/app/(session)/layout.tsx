import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn } from '@/auth';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/ui/sidebar/app-sidebar';
import { Toaster } from '@/components/ui/toaster';

export default async function SessionLayout({
                                              children
                                            }: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    await signIn();
  }

  return (
    <SidebarProvider>
      <AppSidebar className="p-0" />
      <main className="container mx-auto">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </main>
      <Toaster />
    </SidebarProvider>
  );
}
