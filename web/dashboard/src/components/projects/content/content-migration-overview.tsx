'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Database,
  FileText,
  Folder,
  FolderTree,
  GitBranch,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Lock,
  Network,
  Plug,
  Rocket,
  Search,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StepColor = 'blue' | 'green' | 'emerald' | 'orange' | 'sky' | 'purple' | 'teal';

type WizardStep = {
  index: number;
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: StepColor;
  bullets: string[];
  outputIcon: LucideIcon;
  outputLabel: string;
};

const colorClasses: Record<
  StepColor,
  { text: string; ring: string; softBg: string; border: string }
> = {
  blue: {
    text: 'text-blue-600',
    ring: 'border-blue-500',
    softBg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
  },
  green: {
    text: 'text-green-600',
    ring: 'border-green-500',
    softBg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
  },
  emerald: {
    text: 'text-emerald-600',
    ring: 'border-emerald-500',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900',
  },
  orange: {
    text: 'text-orange-500',
    ring: 'border-orange-500',
    softBg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900',
  },
  sky: {
    text: 'text-sky-600',
    ring: 'border-sky-500',
    softBg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-900',
  },
  purple: {
    text: 'text-purple-600',
    ring: 'border-purple-500',
    softBg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-900',
  },
  teal: {
    text: 'text-teal-600',
    ring: 'border-teal-500',
    softBg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-900',
  },
};

const steps: WizardStep[] = [
  {
    index: 1,
    key: 'connect',
    title: 'Connect',
    description: 'Add a connection to your source CMS.',
    icon: Plug,
    color: 'blue',
    bullets: ['Choose CMS type', 'Configure connection', 'Test and verify'],
    outputIcon: CheckCircle2,
    outputLabel: 'Connection active',
  },
  {
    index: 2,
    key: 'discover',
    title: 'Discover & Index',
    description: 'Nexus reads and indexes the structure (metadata only).',
    icon: Search,
    color: 'purple',
    bullets: [
      'Read content types',
      'Read components',
      'Read templates / pages',
      'Read fields & relations',
      'Read locales & assets',
    ],
    outputIcon: Boxes,
    outputLabel: 'Blueprint created',
  },
  {
    index: 3,
    key: 'blueprint',
    title: 'Review Blueprint',
    description: 'Review the extracted structure and validate what was discovered.',
    icon: Network,
    color: 'green',
    bullets: [
      'Explore schemas',
      'Review components',
      'Check fields & relations',
      'Validate completeness',
      'Review statistics',
    ],
    outputIcon: CheckCircle2,
    outputLabel: 'Blueprint validated',
  },
  {
    index: 4,
    key: 'map',
    title: 'Map',
    description: 'Map source schemas and components to the destination CMS.',
    icon: GitBranch,
    color: 'orange',
    bullets: [
      'Map schemas',
      'Map components',
      'Map fields',
      'Define transformations',
      'Save mappings',
    ],
    outputIcon: ArrowRight,
    outputLabel: 'Mappings ready',
  },
  {
    index: 5,
    key: 'select',
    title: 'Select Content',
    description: 'Choose what content, languages and assets to migrate.',
    icon: Folder,
    color: 'sky',
    bullets: [
      'Select content types',
      'Choose content tree or items',
      'Select languages',
      'Include assets',
    ],
    outputIcon: Folder,
    outputLabel: 'Content selected',
  },
  {
    index: 6,
    key: 'migrate',
    title: 'Migrate',
    description: 'Execute the migration to the destination CMS.',
    icon: Rocket,
    color: 'purple',
    bullets: [
      'Transform content',
      'Create content',
      'Upload assets',
      'Resolve references',
      'Publish (if applicable)',
    ],
    outputIcon: CheckCircle2,
    outputLabel: 'Migration completed',
  },
  {
    index: 7,
    key: 'report',
    title: 'Report',
    description: 'Review the results, errors and statistics.',
    icon: FileText,
    color: 'emerald',
    bullets: [
      'View summary',
      'Check errors & warnings',
      'Download report',
      'Re-run if needed',
    ],
    outputIcon: FileText,
    outputLabel: 'Report available',
  },
];

function StepHeader() {
  return (
    <div className="flex items-start gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const c = colorClasses[step.color];
        return (
          <div key={step.key} className="flex flex-1 items-start gap-1">
            <div className="flex min-w-[80px] flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border-2 bg-background text-sm font-semibold',
                  c.ring,
                  c.text,
                )}
              >
                {step.index}
              </span>
              <span className="whitespace-nowrap text-sm font-medium">
                {step.title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mt-4 h-px flex-1 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ step }: { step: WizardStep }) {
  const c = colorClasses[step.color];
  const Icon = step.icon;
  const OutputIcon = step.outputIcon;
  return (
    <div className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex h-10 items-center">
        <Icon className={cn('size-9', c.text)} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold">
        {step.index}. {step.title}
      </h3>
      <p className="mt-2 min-h-[3.5rem] text-sm text-muted-foreground">
        {step.description}
      </p>

      <div className="mt-2">
        <p className="text-sm font-semibold">You will:</p>
        <ul className="mt-1.5 space-y-1">
          {step.bullets.map((b) => (
            <li key={b} className="text-sm text-muted-foreground">
              &bull; {b}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          'mt-5 rounded-lg border p-3',
          c.border,
          c.softBg,
        )}
      >
        <p className={cn('text-xs font-semibold', c.text)}>Output</p>
        <div className="mt-1.5 flex items-center gap-2">
          <OutputIcon className={cn('size-4', c.text)} />
          <span className="text-sm font-medium">{step.outputLabel}</span>
        </div>
      </div>
    </div>
  );
}

function PipelineNode({
  icon: Icon,
  title,
  subtitle,
  tone = 'muted',
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: 'green' | 'blue' | 'purple' | 'orange' | 'muted';
}) {
  const toneClass = {
    green: 'border-green-200 bg-green-50 dark:bg-green-950/30 text-green-700',
    blue: 'border-purple-200 bg-purple-50 dark:bg-purple-950/30 text-purple-700',
    purple:
      'border-blue-200 bg-blue-50 dark:bg-blue-950/30 text-blue-700',
    orange:
      'border-orange-200 bg-orange-50 dark:bg-orange-950/30 text-orange-600',
    muted: 'border-border bg-muted/40 text-foreground',
  }[tone];
  return (
    <div
      className={cn(
        'flex min-w-[130px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center',
        toneClass,
      )}
    >
      <Icon className="size-4" />
      <span className="text-xs font-medium leading-tight">{title}</span>
      {subtitle ? (
        <span className="text-[10px] opacity-70">{subtitle}</span>
      ) : null}
    </div>
  );
}

function CmsBox({ label }: { label: string }) {
  return (
    <div className="flex min-w-[110px] flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center">
      <p className="text-xs font-semibold">{label}</p>
      <Database className="size-5 text-muted-foreground" />
      <p className="text-[10px] text-muted-foreground">
        AEM, Strapi, Contentful, etc.
      </p>
    </div>
  );
}

export function ContentMigrationOverview({
  projectName,
}: {
  projectName: string;
}) {
  void projectName;
  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Meta CMS &ndash; Content Migration
          </h1>
          <p className="mt-1 text-muted-foreground">
            A simple 7-step process to move content between any CMS platforms.
          </p>
        </div>
        <a
          href="#behind-the-scenes"
          className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="size-4" /> How it works?
        </a>
      </div>

      {/* Step header */}
      <StepHeader />

      {/* Step cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {steps.map((step) => (
          <StepCard key={step.key} step={step} />
        ))}
      </div>

      {/* Behind the scenes + side panels */}
      <div
        id="behind-the-scenes"
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]"
      >
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">
            What happens behind the scenes
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CmsBox label="Source CMS" />
            <ArrowRight className="size-4 text-muted-foreground" />
            <PipelineNode
              icon={Lock}
              title="Secure Connection"
              tone="green"
            />
            <ArrowRight className="size-4 text-muted-foreground" />
            <PipelineNode
              icon={Search}
              title="Discovery Engine"
              subtitle="(reads metadata)"
              tone="purple"
            />
            <ArrowRight className="size-4 text-muted-foreground" />
            {/* Canonical model */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1 text-center text-sm font-semibold">
                Nexus Canonical Model
              </p>
              <p className="mb-3 text-center text-[10px] text-muted-foreground">
                (neutral representation)
              </p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5" /> Schemas
                </span>
                <span className="flex items-center gap-1.5">
                  <Boxes className="size-3.5" /> Components
                </span>
                <span className="flex items-center gap-1.5">
                  <Table2 className="size-3.5" /> Fields
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderTree className="size-3.5" /> Content Tree
                </span>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" /> Assets
                </span>
                <span className="flex items-center gap-1.5">
                  <GitBranch className="size-3.5" /> Relations
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
            <PipelineNode
              icon={ArrowRight}
              title="Mapping Engine"
              subtitle="(transforms)"
              tone="orange"
            />
            <ArrowRight className="size-4 text-muted-foreground" />
            <PipelineNode
              icon={Rocket}
              title="Migration Engine"
              subtitle="(executes)"
              tone="blue"
            />
            <ArrowRight className="size-4 text-muted-foreground" />
            <CmsBox label="Destination CMS" />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" /> Validation &amp; Reporting
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Get started</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {[
                'Add a connection to your source CMS.',
                'Discover and index the structure.',
                'Review the blueprint.',
                'Create mappings.',
                'Select the content to migrate.',
                'Run the migration.',
                'Review the report.',
              ].map((text, i) => (
                <li key={text} className="flex gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Need help?</h3>
            <div className="space-y-2 text-sm">
              <a
                href="#"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="size-4" /> Documentation
              </a>
              <a
                href="#"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <HelpCircle className="size-4" /> Contact support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <HelpCircle className="size-4 shrink-0" />
        Discovery reads only metadata and does not change your content. Migration
        will not delete content unless explicitly configured.
      </div>
    </div>
  );
}
