'use client'
import Link from "next/link";
import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import type { UrlObject } from "url";

const link = cva(["font-medium", "text-sm", "transition-colors", "hover:text-primary"], {
  variants: {
    selected: {
      false: ['text-muted-foreground'],
    },

  },
  defaultVariants: {
    selected: false,
  },
});

export interface NavLinkProps
  extends ComponentProps<typeof Link>,
    VariantProps<typeof link> {}

function isSelected(pathname: string, href: string | UrlObject) {
  if(pathname === href) {
    return true
  }

  return href !== '/' && pathname.startsWith(href.toString());
}

export function NavLink({href, className, children}: NavLinkProps) {
  const pathname = usePathname()
  const selected = isSelected(pathname, href);

  return (
      <Link
        href={href}
        className={link({ selected, className })}
      >
        {children}
      </Link>
  );
}