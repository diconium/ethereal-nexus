import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn } from '@/auth';
import { ThemeProvider } from '@/components/theme-provider';
import DashboardLayout from '@/components/layout';

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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DashboardLayout>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </DashboardLayout>
    </ThemeProvider>
  );
}
