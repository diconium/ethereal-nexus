'use client';

import type { ComponentProps } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import LogoImage from '@/components/ui/logo-image';
import { NavUser } from './user-nav';
import { NavMain } from './main-nav';
import Link from 'next/link';

type AppSidebarProps = {
  user: ComponentProps<typeof NavUser>['user']
  navigation: ComponentProps<typeof NavMain>['items']
} & ComponentProps<typeof Sidebar>

export function AppSidebar({ user, navigation, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-8 text-white">
        <Link href="/" className="mx-auto w-full h-full" >
          <LogoImage fill="currentColor"/>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-8">
        <NavMain items={navigation} />
      </SidebarContent>
      <SidebarFooter className="p-8">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
