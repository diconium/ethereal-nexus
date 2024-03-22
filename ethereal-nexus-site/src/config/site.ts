export type SiteConfig = {
  name: string;
  title: string;
  description: string;
  ogImage: string;
  links: {
    diconium: string;
    github: string;
  };
};

export const siteConfig: SiteConfig = {
  name: 'Ethereal Nexus',
  title: 'Component Management Made Easy',
  description:
    'Empower Your Web Development with Seamless Component Management and Deployment',
  ogImage:
    'https://diconium.com/hs-fs/hubfs/Logo/DIC-Logo-diconium-neg-RGB.png?width=78&height=12&name=DIC-Logo-diconium-neg-RGB.png',
  links: {
    diconium: 'https://diconium.com/',
    github: 'https://github.com/diconium/ethereal-nexus',
  },
};
