'use client';

import { MoonIcon, Settings, SunIcon, UserRound } from 'lucide-react';
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
import { UserNavLogout } from '@/components/user/user-nav-logout';
import { User } from 'next-auth';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

type NavUserProps = {
  user: User;
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { setTheme } = useTheme();

  return (
    <SidebarMenu className="gap-4">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 rounded-xl data-[state=open]:bg-orange-500 w-fit"
            >
              <span className="p-2 rounded-xl bg-black-10 text-purple">
                <SunIcon className="absolute scale-100 transition-all dark:scale-0" />
                <MoonIcon className="scale-0 transition-all dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-40 p-3 rounded-xl bg-black-80 border-black-60"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup className="flex flex-col gap-3">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 flex rounded-xl data-[state=open]:bg-orange-500"
            >
                <span className="p-2 rounded-xl bg-orange-700">
                  <UserRound />
                </span>
              <span>{user.name}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-40 p-3 rounded-xl bg-black-80 border-black-60"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup className="flex flex-col gap-3">
              <Link href={`/users/${user.id}?tab=profile`} >
                <DropdownMenuItem className="flex gap-2 items-center">
                  <UserRound width={16} height={16} />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href={`/users/${user.id}?tab=keys`} >
                <DropdownMenuItem className="flex gap-2 items-center">
                  <Settings width={16} height={16} />
                  Settings
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-3 mx-0 bg-black-60"/>
            <DropdownMenuGroup>
              <UserNavLogout />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
