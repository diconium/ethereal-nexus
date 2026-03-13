'use client';

import type { ComponentProps } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import LogoImage from '@/components/ui/logo-image';
import { NavUser } from './user-nav';
import { NavMain } from './main-nav';
import Link from 'next/link';
import { LayoutDashboard, Folder, LayoutGrid, UserRound } from 'lucide-react';
import type { User } from 'next-auth';

type AppSidebarProps = {
  user: User;
  navigation: { title: string; url: string; icon: string; role?: string }[];
} & ComponentProps<typeof Sidebar>;

// Flame mark — the 4 orange paths extracted from LogoImage, cropped to their bounding box.
// Used in place of the full wordmark when the sidebar is collapsed to icon mode.
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="197 2 27 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M218.914 15.1593v-.0002l-1.995-.864c-2.661-1.1519-5.359 1.546-4.207 4.2064l.864 1.9953v.0002l3.737 3.7364c1.473 1.4739 3.863 1.4739 5.337 0 1.474-1.474 1.474-3.8638 0-5.3378l-3.736-3.7361v-.0002Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M204.822 11.7431l1.586.604c2.724 1.0373 5.393-1.6323 4.356-4.3558l-.604-1.586-3.736-3.7364c-1.474-1.474-3.864-1.474-5.338 0-1.474 1.474-1.474 3.8638 0 5.3378l3.736 3.7364Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M213.576 6.4053v.0001l-.819 1.9758c-1.093 2.6345 1.547 5.2742 4.181 4.1815l1.976-.8196V11.7428l3.736-3.7362c1.474-1.474 1.474-3.8637 0-5.3377-1.474-1.474-3.864-1.474-5.338 0l-3.736 3.7363v.0001Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M210.16 20.497v-.0001l.607-1.5777c1.052-2.7332-1.634-5.4192-4.367-4.3673l-1.578.6073v.0001c0-.0001 0-.0001 0 0l-3.736 3.7363c-1.474 1.474-1.474 3.8638 0 5.3378 1.474 1.4739 3.864 1.4739 5.338 0l3.736-3.7364Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AppSidebar({ user, navigation, ...props }: AppSidebarProps) {
  // Map string icon names back to lucide components
  const iconMap = { LayoutDashboard, Folder, LayoutGrid, UserRound } as const;

  const navWithIcons = navigation.map((item) => ({
    ...item,
    icon: iconMap[item.icon as keyof typeof iconMap],
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="overflow-visible! p-1.5!"
            >
              <Link href="/">
                {/* Full wordmark — wrapped in span so [&>svg]:size-4 doesn't apply */}
                <span className="block group-data-[collapsible=icon]:hidden">
                  <LogoImage fill="currentColor" className="w-full h-auto" />
                </span>
                {/* Flame mark only — shown when sidebar is collapsed to icon mode */}
                <span className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full h-full">
                  <LogoMark className="size-5 text-[#FF5600]" />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navWithIcons} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
