export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
};

export type MenuItem = NavItem & {
  description?: string;
  launched?: boolean;
  external?: boolean;
};

export type MainNavItem = NavItem;

export type SidebarNavItem = {
  title: string;
  disabled?: boolean;
  external?: boolean;
} & (
  | {
      href: string;
      items?: never;
    }
  | {
      href?: string;
      items: MenuItem[];
    }
);

export type NavMenuConfig = {
  productNav: SidebarNavItem[];
  links: MenuItem[];
  resourcesNav: SidebarNavItem[];
};

export const navMenuConfig: NavMenuConfig = {
  productNav: [
    {
      title: 'Product',
      items: [
        {
          title: 'Features',
          href: '/ethereal-nexus/docs/features',
          description:
            'Discover the full potential of Ethereal Nexus features.',
        },
        {
          title: 'Changelog',
          href: '/ethereal-nexus/docs/changelog',
          description: `Be in the know with our constant upgrades and new features.`,
        },
        {
          title: 'Integrations',
          href: '/ethereal-nexus/docs/integrations',
          description: `Explore our available integrations.`,
        },
      ],
    },
  ],
  links: [
    // {
    //   title: 'Customers',
    //   href: '/customers',
    // },
  ],
  resourcesNav: [
    {
      title: 'Resources',
      items: [
        {
          title: 'Getting started',
          href: '/ethereal-nexus/docs/introduction',
          description: 'Read the full documentation',
        },
        // {
        //   title: 'Showcase',
        //   href: '/showcase',
        //   description: `Unlock the potential with these powerful use cases.`,
        // },
      ],
    },
  ],
};
