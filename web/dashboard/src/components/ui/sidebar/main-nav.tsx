'use client';

import type { LucideIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { isSelected } from '@/utils/navigation';
import {
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from 'next/navigation';

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  href?: string;
  isActive?: (
    pathname: string,
    searchParams: ReadonlyURLSearchParams,
  ) => boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <>
      {sections.map((section, index) => (
        <SidebarGroup key={section.label ?? `section-${index}`}>
          {section.label ? (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={
                      item.isActive
                        ? item.isActive(pathname, searchParams)
                        : isSelected(pathname, item.url)
                    }
                  >
                    <Link href={item.href ?? item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
