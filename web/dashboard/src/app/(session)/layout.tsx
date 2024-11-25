import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn } from '@/auth';
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
    <DashboardLayout>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </DashboardLayout>
  );
}
