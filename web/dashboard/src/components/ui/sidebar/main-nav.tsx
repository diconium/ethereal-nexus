import { SidebarGroup } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Folder, LayoutDashboard, LayoutGrid, UserRound } from 'lucide-react';
import { createElement } from 'react';
import { cva } from 'class-variance-authority';
import { isSelected } from '@/utils/navigation';
import { usePathname } from 'next/navigation';

interface NavItem {
  items: {
    title: string
    url: string
    icon?: string
    isActive?: boolean
  }[];
}

const icons = {
  LayoutDashboard: LayoutDashboard,
  UserRound: UserRound,
  LayoutGrid: LayoutGrid,
  Folder: Folder,
}

const linkVariants = cva(
  "flex items-center gap-2 p-2 rounded-xl",
  {
    variants: {
      active: {
        true: 'bg-orange-10 dark:bg-orange-80 hover:bg-orange-10 hover:dark:bg-orange-80',
        false: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]'
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

export function NavMain({ items }: NavItem) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="p-0 gap-4">
      {items.map((item) => (
        <Link
          href={item.url}
          key={item.title}
          className={linkVariants({ active: isSelected(pathname, item.url) })}
        >
          <span className="p-2 rounded-xl bg-orange-120 text-white">{item.icon && createElement(icons[item.icon], {color: 'currentColor'})} </span>
          <span>{item.title}</span>
        </Link>
      ))}
    </SidebarGroup>
  );
}
