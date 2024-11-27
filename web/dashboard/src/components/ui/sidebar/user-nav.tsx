'use client';

import { Check, LogOut, MoonIcon, Settings, SunIcon, UserRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { User } from 'next-auth';
import { useTheme } from 'next-themes';
import { signOutAction } from '@/auth/actions/signOutAction';

type NavUserProps = {
  user: User;
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { setTheme, theme, themes } = useTheme();

  return (
    <SidebarMenu className="gap-4">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 rounded-xl w-fit"
            >
              <span className="p-2 rounded-xl bg-black-10 text-purple">
                <SunIcon className="absolute scale-100 transition-all dark:scale-0" />
                <MoonIcon className="scale-0 transition-all dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="relative w-40 p-3 ml-3 overflow-visible"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <span className="absolute bottom-4 -left-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="20" fill="none">
                <g clip-path="url(#a)">
                  <path fill="#2D2D2D" stroke="#595959" d="M16 18.6603 1 10l15-8.66026V18.6603Z" />
                  <g shape-rendering="crispEdges">
                    <rect width="2" height="30" x="15" y="-5" fill="#2D2D2D" rx="8" />
                    <rect width="2" height="30" x="15.5" y="-5" stroke="#595959" rx="7.5" />
                  </g>
                  <path fill="#2D2D2D" d="m15 2.51557 1-.71577v16.2275l-1-.5117V2.51557Z" />
                </g>
                <defs>
                  <clipPath id="a">
                    <path fill="#fff" d="M-192-920h1440V104H-192z" />
                  </clipPath>
                </defs>
              </svg>
            </span>
            <DropdownMenuGroup className="flex flex-col gap-3">
              {
                themes.map(themeName => (
                  <DropdownMenuItem
                    key={themeName}
                    className="flex justify-between"
                    onClick={() => setTheme(themeName)}
                  >
                    <span className={theme === themeName ? 'text-orange-40' : undefined}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </span>
                    {theme === themeName ?
                      <Check width={16} height={16} className="text-orange-40" color="currentColor" /> : null}
                  </DropdownMenuItem>))
              }
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 flex rounded-xl data-[state=open]:text-orange-40"
            >
                <span className="p-2 rounded-xl bg-orange-120">
                  <UserRound className="text-white" />
                </span>
              <span>{user.name}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="relative w-40 p-3 ml-3 overflow-visible"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
             <span className="absolute bottom-4 -left-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="20" fill="none">
                <g clip-path="url(#a)">
                  <path fill="#2D2D2D" stroke="#595959" d="M16 18.6603 1 10l15-8.66026V18.6603Z" />
                  <g shape-rendering="crispEdges">
                    <rect width="2" height="30" x="15" y="-5" fill="#2D2D2D" rx="8" />
                    <rect width="2" height="30" x="15.5" y="-5" stroke="#595959" rx="7.5" />
                  </g>
                  <path fill="#2D2D2D" d="m15 2.51557 1-.71577v16.2275l-1-.5117V2.51557Z" />
                </g>
                <defs>
                  <clipPath id="a">
                    <path fill="#fff" d="M-192-920h1440V104H-192z" />
                  </clipPath>
                </defs>
              </svg>
            </span>
            <DropdownMenuGroup className="flex flex-col gap-3">
              <DropdownMenuItem asChild className="flex gap-2 items-center">
                <Link href={`/users/${user.id}?tab=profile`}>
                  <UserRound width={16} height={16} />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="flex gap-2 items-center">
                <Link href={`/users/${user.id}?tab=keys`}>
                  <Settings width={16} height={16} />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-3 mx-0 bg-black-60" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="flex gap-2 items-center"
                onClick={async () => {
                  await signOutAction()
                }}>
                <LogOut width={16} height={16} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
