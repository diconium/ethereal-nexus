import Link from 'next/link';

type AiSectionNavProps = {
  projectId: string;
  environmentId?: string;
  active:
    | 'chatbots'
    | 'catalogues'
    | 'author-dialogs'
    | 'content-advisor'
    | 'settings';
};

const SECTIONS = [
  { key: 'chatbots', label: 'Chat bots' },
  { key: 'catalogues', label: 'Catalogues' },
  { key: 'author-dialogs', label: 'Author Dialogs' },
  { key: 'content-advisor', label: 'Content Advisor' },
  { key: 'settings', label: 'Settings' },
] as const;

export function AiSectionNav({
  projectId,
  environmentId,
  active,
}: AiSectionNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SECTIONS.map((section) => {
        const isActive = section.key === active;
        return (
          <Link
            key={section.key}
            href={`/projects/${projectId}/ai/${section.key}${environmentId ? `?env=${environmentId}` : ''}`}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
