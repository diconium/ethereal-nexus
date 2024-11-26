'use client';

import { type LucideIcon } from 'lucide-react';


import { SidebarGroup } from '@/components/ui/sidebar';
import Link from 'next/link';

interface NavItem {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
  }[];
}

export function NavMain({ items }: NavItem) {
  return (
    <SidebarGroup className="p-0 gap-4">
      {items.map((item) => (
        <Link
          href={item.url}
          key={item.title}
          className="flex items-center gap-2 p-2 rounded-xl active:bg-orange-500"
        >
          <span className="p-2 rounded-xl bg-orange-700">{item.icon && <item.icon />} </span>
          <span>{item.title}</span>
        </Link>

      ))}
    </SidebarGroup>
  );
}
