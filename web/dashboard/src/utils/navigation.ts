import type { UrlObject } from 'url';

export function isSelected(pathname: string, href: string | UrlObject) {
  if(pathname === href) {
    return true
  }

  return href !== '/' && pathname.startsWith(href.toString());
}
