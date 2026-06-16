import React from "react";
import NewUserModal from './modal';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';

export default async function NewUserModalPage() {
  const session = await auth()
  if(session?.user?.role !== 'admin') {
    notFound();
  }
  return <NewUserModal />
}
