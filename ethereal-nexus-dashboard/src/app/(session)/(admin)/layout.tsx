import React from 'react';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth()
  if(session?.user?.role !== 'admin') {
    notFound();
  }

  return <>{children}</>;
}
