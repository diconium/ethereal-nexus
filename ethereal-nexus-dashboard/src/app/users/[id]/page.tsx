import { Separator } from '@/components/ui/separator';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { getUserById } from '@/data/users/actions';
import { ApiKeyList } from '@/components/user/api-key-table/api-key-list';

export default async function UserPage({ params: { id } }: any) {
  const session = await auth();
  const user = await getUserById(session?.user?.id);

  if (!user.success || id !== session?.user?.id) {
    notFound();
  }

  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Welcome {user.data.name}</h3>
        <p className="text-sm text-muted-foreground">
          Personal Data
        </p>
      </div>
      <Separator />
      <ApiKeyList />
    </div>
  );
}
