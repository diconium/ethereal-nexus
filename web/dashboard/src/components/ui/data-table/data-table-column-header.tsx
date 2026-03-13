import { cn } from '@/lib/utils';

export function DataTableColumnHeader({ column, title, className = '' }) {
  return <div className={cn(className)}>{title}</div>;
}
