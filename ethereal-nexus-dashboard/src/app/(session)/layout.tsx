import React from "react";
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';

export default async function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
