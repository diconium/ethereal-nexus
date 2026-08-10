import type { LucideIcon } from 'lucide-react';

export function ContentPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-12 text-center">
        <Icon className="size-10 text-muted-foreground" strokeWidth={1.25} />
        <p className="mt-4 text-sm font-medium">{title} coming soon</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          This section is not yet available. It will be built out as part of the
          Content Migration workflow.
        </p>
      </div>
    </div>
  );
}
