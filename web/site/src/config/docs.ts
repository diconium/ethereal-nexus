import type { SidebarNavItem } from '@/config/nav-menu.ts';

export type DocsConfig = {
  sidebarNav: SidebarNavItem[];
};

export const docsConfig: DocsConfig = {
  sidebarNav: [
    {
      title: 'Getting started',
      items: [
        {
          title: 'Introduction',
          href: '/ethereal-nexus/docs/introduction',
        },
        {
          title: 'Setup',
          href: '/ethereal-nexus/docs/setup',
        },
      ],
    },
    {
      title: 'Core concepts',
      items: [
        {
          title: 'Dashboard',
          href: '/ethereal-nexus/docs/dashboard',
        },
        {
          title: 'CLI',
          href: '/ethereal-nexus/docs/cli',
        },
        {
          title: 'Components',
          href: '/ethereal-nexus/docs/components',
        },
        {
          title: 'Connectors',
          href: '/ethereal-nexus/docs/connectors',
        },
      ],
    },
    {
      title: 'Dashboard',
      items: [
        {
          title: 'Introduction',
          href: '/ethereal-nexus/docs/dashboard/introduction',
        },
        {
          title: 'API',
          href: '/ethereal-nexus/docs/dashboard/api',
        },
      ],
    },
    {
      title: 'Connectors',
      items: [
        {
          title: 'AEM',
          href: '/ethereal-nexus/docs/connectors/aem',
        },
        // {
        //   title: 'Edge Delivery Services',
        //   href: '/docs/connectors/eds',
        // },
        {
          title: 'Strapi',
          href: '/ethereal-nexus/docs/connectors/strapi',
        },
      ],
    },
  ],
};
