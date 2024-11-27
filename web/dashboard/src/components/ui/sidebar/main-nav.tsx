'use client';

import { SidebarGroup } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Folder, LayoutDashboard, LayoutGrid, UserRound } from 'lucide-react';
import { createElement } from 'react';

interface NavItem {
  items: {
    title: string
    url: string
    icon?: string
    isActive?: boolean
  }[];
}

const icons = {
  LayoutDashboard: LayoutDashboard,
  UserRound: UserRound,
  LayoutGrid: LayoutGrid,
  Folder: Folder,
}

export function NavMain({ items }: NavItem) {
  return (
    <SidebarGroup className="p-0 gap-4">
      {items.map((item) => (
        <Link
          href={item.url}
          key={item.title}
          className="flex items-center gap-2 p-2 rounded-xl active:bg-orange-500 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
        >
          <span className="p-2 rounded-xl bg-orange-700">{item.icon && createElement(icons[item.icon])} </span>
          <span>{item.title}</span>
        </Link>
      ))}
    </SidebarGroup>
  );
}
