"use client"

import * as React from "react"
import {
  BookOpen,
  Bot, Folder,
  Frame, LayoutDashboard, LayoutGrid,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal, UserRound
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import LogoImage from '@/components/ui/logo-image';
import { NavUser } from './user-nav';
import { NavMain } from './main-nav';
import Link from 'next/link';

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
    },
    {
      title: "Components",
      url: "/components",
      icon: LayoutGrid,
    },
    {
      title: "Users",
      url: "/users",
      icon: UserRound,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="p-8 text-white">
        <Link href="/" className="mx-auto w-full h-full" >
          <LogoImage fill="currentColor"/>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-8">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="p-8">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
