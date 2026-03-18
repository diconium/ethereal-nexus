import { Separator } from '@/components/ui/separator';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getPublicUserById } from '@/data/users/actions';
import { ApiKeyList } from '@/components/user/api-key-table/api-key-list';
import React from 'react';
import ProfileForm from '@/components/user/profile-form';
import PasswordForm from '@/components/user/password-form';

export default async function UserPage(props: any) {
  const { id } = await props.params;

  const session = await auth();
  const user = await getPublicUserById(session?.user?.id);
  if (!user.success || id !== session?.user?.id) {
    notFound();
  }

  const { name, email } = user.data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your name and email address.
        </p>
      </div>
      <ProfileForm name={name} email={email} />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="text-sm text-muted-foreground">
          Change your password. You will be signed out after saving.
        </p>
      </div>
      <PasswordForm />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal API keys.
        </p>
      </div>
      <ApiKeyList />
    </div>
  );
}
