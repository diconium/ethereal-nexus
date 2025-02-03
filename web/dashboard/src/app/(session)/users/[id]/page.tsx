import { Separator } from '@/components/ui/separator';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getPublicUserById } from '@/data/users/actions';
import { ApiKeyList } from '@/components/user/api-key-table/api-key-list';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileForm from '@/components/user/profile-form';
import PasswordForm from '@/components/user/password-form';

export default async function UserPage(props: any) {
  const {
    tab
  } = await props.searchParams;

  const {
    id
  } = await props.params;

  const session = await auth();
  const user = await getPublicUserById(session?.user?.id);
  if (!user.success || id !== session?.user?.id) {
    notFound();
  }

  const { name, email } = user.data;

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome {user.data.name}</h2>
          <p className="text-muted-foreground">User Settings</p>
        </div>
      </div>
      <Separator />
      <Tabs defaultValue={tab ?? 'profile'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger value="password">
            Password
          </TabsTrigger>
          <TabsTrigger value="keys">
            Api Keys
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4 p-6">
          <ProfileForm name={name} email={email} />
        </TabsContent>
        <TabsContent value="password" className="space-y-4 p-6">
          <PasswordForm />
        </TabsContent>
        <TabsContent value="keys" className="space-y-4 p-6">
          <ApiKeyList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
