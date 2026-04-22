'use client';

import { useEffect, useState, type ComponentProps } from 'react';
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
import { NavMain, type NavSection } from './main-nav';
import Link from 'next/link';
import {
  Activity,
  Bot,
  LayoutDashboard,
  Folder,
  LayoutGrid,
  MessageSquare,
  Settings,
  UserRound,
} from 'lucide-react';
import type { User } from 'next-auth';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { useProject } from '@/lib/project-context';
import { AI_STATE_UPDATED_EVENT } from '@/lib/ai-events';
import type { Catalogue, Chatbot, ProjectAiFeatureKey } from '@/data/ai/dto';

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

  const { selectedProject, selectedEnvironment } = useProject();
  const [projectAiState, setProjectAiState] = useState<{
    aiEnabled: boolean;
    enabled: boolean;
    enabledAiFeatures: ProjectAiFeatureKey[];
    chatbots: Chatbot[];
    catalogues: Catalogue[];
  }>({
    aiEnabled: false,
    enabled: false,
    enabledAiFeatures: [],
    chatbots: [],
    catalogues: [],
  });
  const platformTitles = new Set(['All Components', 'Users']);

  useEffect(() => {
    let cancelled = false;

    async function loadDemos() {
      if (!selectedProject?.id || !selectedEnvironment?.id) {
        setProjectAiState({
          aiEnabled: false,
          enabled: false,
          enabledAiFeatures: [],
          chatbots: [],
          catalogues: [],
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/projects/${selectedProject.id}/environments/${selectedEnvironment.id}/demos`,
          { credentials: 'include' },
        );

        if (!response.ok) {
          throw new Error('Failed to load demos');
        }

        const payload = (await response.json()) as {
          aiEnabled?: boolean;
          enabled?: boolean;
          enabledAiFeatures?: ProjectAiFeatureKey[];
          chatbots?: Chatbot[];
          catalogues?: Catalogue[];
        };

        if (!cancelled) {
          setProjectAiState({
            aiEnabled: payload.aiEnabled ?? false,
            enabled: payload.enabled ?? false,
            enabledAiFeatures: payload.enabledAiFeatures ?? [],
            chatbots: payload.chatbots ?? [],
            catalogues: payload.catalogues ?? [],
          });
        }
      } catch {
        if (!cancelled) {
          setProjectAiState({
            aiEnabled: false,
            enabled: false,
            enabledAiFeatures: [],
            chatbots: [],
            catalogues: [],
          });
        }
      }
    }

    void loadDemos();
    const handleRefresh = () => {
      void loadDemos();
    };
    window.addEventListener(AI_STATE_UPDATED_EVENT, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(AI_STATE_UPDATED_EVENT, handleRefresh);
    };
  }, [selectedEnvironment?.id, selectedProject?.id]);

  const primaryItems = navWithIcons.filter(
    (item) => !platformTitles.has(item.title),
  );

  const platformItems = navWithIcons.filter((item) =>
    platformTitles.has(item.title),
  );

  const sections: NavSection[] = [];

  if (primaryItems.length > 0) {
    sections.push({
      items: primaryItems.map((item) => ({
        title: item.title,
        url: item.url,
        icon: item.icon,
        href: item.url,
      })),
    });
  }

  if (selectedProject) {
    const projectBase = `/projects/${selectedProject.id}`;
    const buildProjectHref = (tab: string) => {
      const envSuffix = selectedEnvironment
        ? `&env=${selectedEnvironment.id}`
        : '';
      return `${projectBase}?tab=${tab}${envSuffix}`;
    };
    const matchesProjectPath = (pathname: string) =>
      pathname === projectBase || pathname.startsWith(`${projectBase}/`);
    const projectSettingsPath = `${projectBase}/settings`;
    const buildSettingsHref = (section: string) =>
      `${projectSettingsPath}?section=${section}${selectedEnvironment ? `&env=${selectedEnvironment.id}` : ''}`;
    const projectActivityPath = `${projectBase}/activity`;
    const aiItems = [
      projectAiState.enabledAiFeatures.includes('chatbots')
        ? {
            title: 'Chat bots',
            url: `${projectBase}/ai/chatbots`,
            href: `${projectBase}/ai/chatbots${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            isActive: (pathname: string) =>
              pathname === `${projectBase}/ai/chatbots`,
          }
        : null,
      projectAiState.enabledAiFeatures.includes('catalogues')
        ? {
            title: 'Catalogues',
            url: `${projectBase}/ai/catalogues`,
            href: `${projectBase}/ai/catalogues${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            isActive: (pathname: string) =>
              pathname.startsWith(`${projectBase}/ai/catalogues`),
          }
        : null,
      projectAiState.enabledAiFeatures.includes('author-dialogs')
        ? {
            title: 'Author Dialogs',
            url: `${projectBase}/ai/author-dialogs`,
            href: `${projectBase}/ai/author-dialogs${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            isActive: (pathname: string) =>
              pathname === `${projectBase}/ai/author-dialogs`,
          }
        : null,
      projectAiState.enabledAiFeatures.includes('content-advisor')
        ? {
            title: 'Content Advisor',
            url: `${projectBase}/ai/content-advisor`,
            href: `${projectBase}/ai/content-advisor${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            isActive: (pathname: string) =>
              pathname === `${projectBase}/ai/content-advisor`,
          }
        : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null);

    sections.push({
      label: 'Project',
      items: [
        {
          title: 'Components',
          url: projectBase,
          href: buildProjectHref('components'),
          icon: LayoutGrid,
          isActive: (pathname, searchParams) => {
            if (!matchesProjectPath(pathname)) {
              return false;
            }
            const tab = searchParams.get('tab');
            if (tab === null || tab === 'components') {
              return true;
            }
            return pathname.startsWith(`${projectBase}/components`);
          },
        },
        {
          title: 'Activity',
          url: projectActivityPath,
          href: projectActivityPath,
          icon: Activity,
          isActive: (pathname) => pathname === projectActivityPath,
        },
        ...(projectAiState.aiEnabled && aiItems.length > 0
          ? [
              {
                title: 'Agentic AI',
                url: `${projectBase}/ai`,
                href: `${projectBase}/ai${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
                icon: Bot,
                isActive: (pathname) =>
                  pathname.startsWith(`${projectBase}/ai`),
                items: aiItems,
              },
            ]
          : []),
        {
          title: 'Settings',
          url: projectSettingsPath,
          href: buildSettingsHref('general'),
          icon: Settings,
          isActive: (pathname, searchParams) =>
            pathname === projectSettingsPath &&
            (searchParams.get('section') ?? 'general') === 'general',
        },
      ],
    });

    if (
      projectAiState.enabled &&
      (projectAiState.chatbots.length > 0 ||
        projectAiState.catalogues.length > 0)
    ) {
      sections.push({
        label: 'Demos',
        items: [
          ...projectAiState.chatbots.map((chatbot) => ({
            title: chatbot.name,
            url: `${projectBase}/demos/${chatbot.slug}`,
            href: `${projectBase}/demos/${chatbot.slug}${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            icon: MessageSquare,
            isActive: (pathname: string) =>
              pathname === `${projectBase}/demos/${chatbot.slug}`,
          })),
          ...projectAiState.catalogues.map((catalogue) => ({
            title: catalogue.name,
            url: `${projectBase}/demos/catalogues/${catalogue.slug}`,
            href: `${projectBase}/demos/catalogues/${catalogue.slug}${selectedEnvironment ? `?env=${selectedEnvironment.id}` : ''}`,
            icon: Folder,
            isActive: (pathname: string) =>
              pathname === `${projectBase}/demos/catalogues/${catalogue.slug}`,
          })),
        ],
      });
    }
  }

  if (platformItems.length > 0) {
    sections.push({
      label: 'Platform',
      items: platformItems.map((item) => ({
        title: item.title,
        url: item.url,
        href: item.url,
        icon: item.icon,
      })),
    });
  }

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
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
