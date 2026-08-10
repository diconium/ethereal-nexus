import { cn } from '@/lib/utils';

export type CmsId =
  | 'aem'
  | 'firstspirit'
  | 'strapi'
  | 'contentful'
  | 'datocms';

type LogoProps = { className?: string };

export function AemLogo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[#FA0F00] text-white',
        className,
      )}
    >
      <svg
        viewBox="0 0 30 26"
        width="55%"
        height="55%"
        aria-hidden="true"
      >
        <path fill="currentColor" d="M19 0h11v26L19 0Z" />
        <path fill="currentColor" d="M11 0H0v26L11 0Z" />
        <path fill="currentColor" d="M15 9.7 22 26h-4.6l-2.1-5.3H10L15 9.7Z" />
      </svg>
    </div>
  );
}

export function FirstSpiritLogo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[#E30613] font-bold text-white',
        className,
      )}
    >
      Fs
    </div>
  );
}

export function StrapiLogo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[#4945FF] font-bold text-white',
        className,
      )}
    >
      S
    </div>
  );
}

export function ContentfulLogo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[#2478CC] font-bold text-white',
        className,
      )}
    >
      C
    </div>
  );
}

export function DatoCmsLogo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-[#FF7751] font-bold text-white',
        className,
      )}
    >
      D
    </div>
  );
}

export type CmsProvider = {
  id: CmsId;
  name: string;
  vendor?: string;
  Logo: (props: LogoProps) => React.ReactNode;
  available: boolean;
};

export const cmsProviders: CmsProvider[] = [
  { id: 'aem', name: 'Adobe Experience Manager', vendor: 'Adobe', Logo: AemLogo, available: true },
  { id: 'firstspirit', name: 'FirstSpirit', Logo: FirstSpiritLogo, available: false },
  { id: 'strapi', name: 'Strapi', Logo: StrapiLogo, available: true },
  { id: 'contentful', name: 'Contentful', Logo: ContentfulLogo, available: false },
  { id: 'datocms', name: 'DatoCMS', Logo: DatoCmsLogo, available: false },
];

export function getCmsProvider(id: CmsId) {
  return cmsProviders.find((p) => p.id === id);
}

/** Logo component keyed by connector type. */
export const cmsLogoByKey: Record<CmsId, (props: LogoProps) => React.ReactNode> =
  {
    aem: AemLogo,
    firstspirit: FirstSpiritLogo,
    strapi: StrapiLogo,
    contentful: ContentfulLogo,
    datocms: DatoCmsLogo,
  };
