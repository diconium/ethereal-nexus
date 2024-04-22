import * as React from 'react';

import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { type MenuItem, navMenuConfig } from '@/config/nav-menu';

const productsNavMainItem = navMenuConfig.productNav[0];
const resourcesNavMainItem = navMenuConfig.resourcesNav[0];

export function MainNavigationMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            {productsNavMainItem.title}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-1 lg:w-[600px] ">
              {productsNavMainItem.items?.map((example) => (
                <ListItem key={example.title} {...example} />
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          {navMenuConfig.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={navigationMenuTriggerStyle()}
            >
              {link.title}
            </a>
          ))}
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>
            {resourcesNavMainItem.title}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-1 lg:w-[600px] ">
              {resourcesNavMainItem.items?.map((example) => (
                <ListItem key={example.title} {...example} />
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem: React.FC<MenuItem> = ({
  title,
  href,
  description,
  external,
}) => {
  const target = external ? '_blank' : undefined;

  return (
    <li>
      <a
        href={href}
        target={target}
        className={cn(
          'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        )}
      >
        <div className="text-sm font-medium leading-none">
          <span className="mr-2">{title}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      </a>
    </li>
  );
};
ListItem.displayName = 'ListItem';
