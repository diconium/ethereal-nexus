import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth } from '@/auth';
import { UserNavLogout } from '@/components/user/user-nav-logout';
import { UserNavLogin } from '@/components/user/user-nav-login';
import Link from 'next/link';



export async function UserNav() {
  const session = await auth();
  const avatarText = session?.user?.name
    ?.split(' ')
    .map(name => name.charAt(0)
      .toUpperCase())
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/01.png" alt="@shadcn" />
            <AvatarFallback>{avatarText}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {session ? <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href={`/users/${session?.user?.id}?tab=profile`} >
                <DropdownMenuItem>Profile</DropdownMenuItem>
              </Link>
              <Link href={`/users/${session?.user?.id}?tab=keys`} >
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <UserNavLogout />
          </>
          :
          <UserNavLogin />
        }
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
