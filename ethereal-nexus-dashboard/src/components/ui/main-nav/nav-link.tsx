'use client'
import Link from "next/link";
import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import type { UrlObject } from "url";

const link = cva(["font-medium", "transition-colors"], {
  variants: {
    selected: {
      false: [''],
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

export function NavLink({href, className, children, target, rel}: NavLinkProps) {
  const pathname = usePathname()
  const selected = isSelected(pathname, href);

  const activeNavLink = selected ? 'bg-orange-600 rounded-full text-white py-4 px-8 flex justify-center' : '';
  const combinedClassName = `${activeNavLink} ${className}`;
  return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={link({ selected, className: combinedClassName })}
      >
        {children}
      </Link>
  );
}
