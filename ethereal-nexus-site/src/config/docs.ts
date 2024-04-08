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
          href: '/docs/introduction/',
        },
        {
          title: 'Installation',
          href: '/docs/installation/',
        },
      ],
    },
    {
      title: 'Core concepts',
      items: [
        {
          title: 'Dashboard',
          href: '/docs/dashboard',
        },
        {
          title: 'CLI',
          href: '/docs/cli',
        },
        {
          title: 'Components',
          href: '/docs/components',
        },
        {
          title: 'Connectors',
          href: '/docs/connectors',
        },
      ],
    },
    {
      title: 'Dashboard',
      items: [
        {
          title: 'Introduction',
          href: '/docs/dashboard/introduction',
        },
        {
          title: 'API',
          href: '/docs/dashboard/api',
        },
      ],
    },
    {
      title: 'Connectors',
      items: [
        {
          title: 'AEM',
          href: '/docs/connectors/aem',
        },
        {
          title: 'Edge Delivery Services',
          href: '/docs/connectors/eds',
        },
      ],
    },
  ],
};
