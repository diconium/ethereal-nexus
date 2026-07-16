'use client';

import { useState, useTransition, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Check, Shield, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  deleteSearchApp,
  upsertSearchApp,
  upsertSearchAppApiSettings,
  getSearchAppBlocks,
  clearSearchAppBlocks,
  type SearchAppBlockStatus,
} from '@/data/ai/actions';
import { DEFAULT_SEARCH_APP_API_SETTINGS_VALUES } from '@/data/ai/search-app-api-settings';
import type {
  SearchApp,
  SearchAppApiSettings,
  SearchAppApiSettingsInput,
  SearchAppInput,
} from '@/data/ai/dto';
import { AI_STATE_UPDATED_EVENT } from '@/lib/ai-events';
import {
  SEARCH_PROVIDER_BADGE_STYLES,
  SEARCH_PROVIDER_OPTIONS,
  VERTEX_SEARCH_LOCATIONS,
  getSearchProviderLabel,
  type SearchProvider,
  type VertexSearchLocation,
} from '@/data/ai/provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchesManagerProps = {
  projectId: string;
  environmentId: string;
  searchApps: SearchApp[];
  apiSettings: SearchAppApiSettings[];
};

type SearchAppFormState = {
  id?: string;
  name: string;
  slug: string;
  public_slug: string;
  provider: SearchProvider;
  gcp_project_id: string;
  location: VertexSearchLocation;
  collection_id: string;
  engine_id: string;
  serving_config_id: string;
  credentials_json: string;
  page_size: number;
  page_size_max: number;
  enabled: boolean;
};

type ApiSettingsDraft = Omit<
  SearchAppApiSettingsInput,
  'project_id' | 'environment_id'
> & { id?: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_FORM: SearchAppFormState = {
  name: '',
  slug: '',
  public_slug: '',
  provider: 'vertex-ai-agent-search',
  gcp_project_id: '',
  location: 'global',
  collection_id: 'default_collection',
  engine_id: '',
  serving_config_id: 'default_search',
  credentials_json: '',
  page_size: 10,
  page_size_max: 25,
  enabled: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function autoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeSearchLocation(value: string | null | undefined): VertexSearchLocation {
  return VERTEX_SEARCH_LOCATIONS.includes(value as VertexSearchLocation)
    ? (value as VertexSearchLocation)
    : 'global';
}

function notifyDemosSidebar() {
  window.dispatchEvent(new CustomEvent(AI_STATE_UPDATED_EVENT));
}

function buildSearchEndpoint(publicSlug: string) {
  return publicSlug ? `/api/v1/search/${publicSlug}` : '';
}

function buildDefaultApiSettings(searchAppId: string): ApiSettingsDraft {
  return { search_app_id: searchAppId, ...DEFAULT_SEARCH_APP_API_SETTINGS_VALUES };
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function NumericField({
  label, hint, value, min, max, onChange, id: idProp,
}: {
  label: string; hint: string; value: number;
  min: number; max: number; onChange: (v: number) => void;
  id?: string;
}) {
  const id = idProp ?? `numeric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Input
        id={id}
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value || min))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToggleRow({
  title, description, checked, onCheckedChange,
}: {
  title: string; description: string;
  checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function AccordionSection({
  title, description, children, defaultOpen = false,
}: {
  title: string; description: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border">
      <CollapsibleTrigger asChild>
        <Button
          type="button" variant="ghost"
          className="h-auto w-full justify-between rounded-xl px-4 py-3 text-left"
        >
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex w-full items-center">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        const isLast = step === total;
        return (
          <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  done || active
                    ? 'bg-primary text-primary-foreground'
                    : 'border-2 border-muted-foreground/30 bg-background text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {labels[i]}
              </span>
            </div>
            {/* Connector line — grows to fill available space */}
            {!isLast && (
              <div className={`mx-3 mb-4 h-px flex-1 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create wizard — 2 steps
// ---------------------------------------------------------------------------

type CreateWizardProps = {
  onClose: () => void;
  onCreated: (app: SearchApp, settings?: SearchAppApiSettings) => void;
  projectId: string;
  environmentId: string;
};

function CreateWizard({ onClose, onCreated, projectId, environmentId }: CreateWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SearchAppFormState>(EMPTY_FORM);
  // Track whether the user has manually edited the slug fields so we stop
  // auto-generating from the name once they take control.
  const [slugTouched, setSlugTouched] = useState(false);
  const [publicSlugTouched, setPublicSlugTouched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof SearchAppFormState>(k: K, v: SearchAppFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const step1Valid = form.name.trim().length >= 2;
  const step2Valid =
    form.gcp_project_id.trim().length > 0 && form.engine_id.trim().length > 0;

  const handleCreate = () => {
    startTransition(async () => {
      const slug = form.slug || autoSlug(form.name);
      const public_slug = form.public_slug || slug;

      const payload: SearchAppInput = {
        project_id: projectId,
        environment_id: environmentId,
        name: form.name,
        slug,
        public_slug,
        provider: form.provider,
        gcp_project_id: form.gcp_project_id,
        location: form.location,
        collection_id: form.collection_id,
        engine_id: form.engine_id,
        serving_config_id: form.serving_config_id,
        credentials_json: form.credentials_json || null,
        page_size: form.page_size,
        page_size_max: form.page_size_max,
        enabled: form.enabled,
      };

      const result = await upsertSearchApp(payload);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Search app created.');
      notifyDemosSidebar();
      onCreated(result.data);
    });
  };

  const STEP_LABELS = ['App Identity', 'Google Cloud Config'];

  return (
    <>
      <DialogHeader className="pb-4">
        <DialogTitle>New Search App</DialogTitle>
        <DialogDescription>
          {step === 1
            ? 'Give your search app a name and public endpoint.'
            : 'Connect to your Vertex AI Agent Search data store.'}
        </DialogDescription>
        <div className="pt-4 w-full">
          <StepIndicator current={step} total={2} labels={STEP_LABELS} />
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <>
            <div className="space-y-1">
              <label htmlFor="wizard-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="wizard-name"
                placeholder="My Search App"
                value={form.name}
                autoFocus
                onChange={(e) => {
                  const name = e.target.value;
                  const generated = autoSlug(name);
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugTouched ? prev.slug : generated,
                    public_slug: publicSlugTouched ? prev.public_slug : generated,
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="wizard-slug" className="text-sm font-medium">Slug</label>
                <Input
                  id="wizard-slug"
                  placeholder="my-search-app"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update('slug', e.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Internal identifier within this environment.
                </p>
              </div>
              <div className="space-y-1">
                <label htmlFor="wizard-public-slug" className="text-sm font-medium">Public slug</label>
                <Input
                  id="wizard-public-slug"
                  placeholder="my-search-app"
                  value={form.public_slug}
                  onChange={(e) => {
                    setPublicSlugTouched(true);
                    update('public_slug', e.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Used in the public API URL. Must be globally unique.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Public endpoint:{' '}
                {form.public_slug ? (
                  <span className="font-mono">{buildSearchEndpoint(form.public_slug)}</span>
                ) : (
                  <span className="italic opacity-50">generated from the public slug above</span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="wizard-provider" className="text-sm font-medium">Provider</label>
              <Select
                value={form.provider}
                onValueChange={(v) => update('provider', v as SearchProvider)}
              >
                <SelectTrigger id="wizard-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Step 2: Google Cloud ── */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="wizard-gcp-project" className="text-sm font-medium">
                  GCP Project ID <span className="text-destructive">*</span>
                </label>
                <Input
                  id="wizard-gcp-project"
                  placeholder="my-gcp-project"
                  value={form.gcp_project_id}
                  autoFocus
                  onChange={(e) => update('gcp_project_id', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="wizard-location" className="text-sm font-medium">Location</label>
                <Select value={form.location} onValueChange={(v) => update('location', normalizeSearchLocation(v))}>
                  <SelectTrigger id="wizard-location"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">global</SelectItem>
                    <SelectItem value="us">us</SelectItem>
                    <SelectItem value="eu">eu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="wizard-engine-id" className="text-sm font-medium">
                Engine (App) ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="wizard-engine-id"
                placeholder="dsv-poc-public-search_1783421988477"
                value={form.engine_id}
                onChange={(e) => update('engine_id', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in Google Cloud Console → AI Applications → your app → ID column.
              </p>
            </div>

            <Separator />

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Advanced (optional — defaults shown)
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Serving Config ID</label>
                <Input
                  placeholder="default_config"
                  value={form.serving_config_id}
                  onChange={(e) => update('serving_config_id', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="wizard-collection-id" className="text-sm font-medium">Collection ID</label>
                <Input
                  id="wizard-collection-id"
                  placeholder="default_collection"
                  value={form.collection_id}
                  onChange={(e) => update('collection_id', e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="flex-row items-center justify-between gap-2 pt-2">
        <div>
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)} disabled={isPending}>
              ← Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!step2Valid || isPending}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------

type EditFormProps = {
  app: SearchApp;
  existingSettings: SearchAppApiSettings | undefined;
  onClose: () => void;
  onSaved: (app: SearchApp, settings?: SearchAppApiSettings) => void;
  projectId: string;
  environmentId: string;
};

function EditForm({
  app, existingSettings, onClose, onSaved, projectId, environmentId,
}: EditFormProps) {
  const config = app.provider_config as {
    gcp_project_id?: string | null;
    location?: string | null;
    collection_id?: string | null;
    engine_id?: string | null;
    serving_config_id?: string | null;
  };

  const [form, setForm] = useState<SearchAppFormState>({
    id: app.id,
    name: app.name,
    slug: app.slug,
    public_slug: app.public_slug,
    provider: app.provider,
    gcp_project_id: config.gcp_project_id || '',
    location: normalizeSearchLocation(config.location),
    collection_id: config.collection_id || 'default_collection',
    engine_id: config.engine_id || '',
    serving_config_id: config.serving_config_id || 'default_search',
    // Write-only: never pre-populate from stored value (has_credentials shows status)
    credentials_json: '',
    page_size: app.page_size,
    page_size_max: app.page_size_max,
    enabled: app.enabled,
  });

  const [apiDraft, setApiDraft] = useState<ApiSettingsDraft>(() => ({
    search_app_id: app.id,
    id: existingSettings?.id,
    rate_limit_enabled: existingSettings?.rate_limit_enabled ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_enabled,
    rate_limit_max_requests: existingSettings?.rate_limit_max_requests ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_max_requests,
    rate_limit_window_seconds: existingSettings?.rate_limit_window_seconds ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_window_seconds,
    rate_limit_use_ip: existingSettings?.rate_limit_use_ip ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_use_ip,
    rate_limit_use_session_cookie: existingSettings?.rate_limit_use_session_cookie ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_use_session_cookie,
    rate_limit_use_fingerprint: existingSettings?.rate_limit_use_fingerprint ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.rate_limit_use_fingerprint,
    fingerprint_header_name: existingSettings?.fingerprint_header_name ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.fingerprint_header_name,
    query_size_limit_enabled: existingSettings?.query_size_limit_enabled ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.query_size_limit_enabled,
    max_query_characters: existingSettings?.max_query_characters ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.max_query_characters,
    max_request_body_bytes: existingSettings?.max_request_body_bytes ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.max_request_body_bytes,
    session_request_cap_enabled: existingSettings?.session_request_cap_enabled ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.session_request_cap_enabled,
    session_request_cap_max_requests: existingSettings?.session_request_cap_max_requests ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.session_request_cap_max_requests,
    session_request_cap_window_seconds: existingSettings?.session_request_cap_window_seconds ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.session_request_cap_window_seconds,
    temporary_block_enabled: existingSettings?.temporary_block_enabled ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.temporary_block_enabled,
    temporary_block_violation_threshold: existingSettings?.temporary_block_violation_threshold ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.temporary_block_violation_threshold,
    temporary_block_window_seconds: existingSettings?.temporary_block_window_seconds ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.temporary_block_window_seconds,
    temporary_block_duration_seconds: existingSettings?.temporary_block_duration_seconds ?? DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.temporary_block_duration_seconds,
    allowed_origins: (existingSettings?.allowed_origins ?? [...DEFAULT_SEARCH_APP_API_SETTINGS_VALUES.allowed_origins]) as string[],
  }));

  const [newOriginInput, setNewOriginInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof SearchAppFormState>(k: K, v: SearchAppFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));
  const updateApi = <K extends keyof ApiSettingsDraft>(k: K, v: ApiSettingsDraft[K]) =>
    setApiDraft((prev) => ({ ...prev, [k]: v }));

  const addOrigin = () => {
    const trimmed = newOriginInput.trim();
    if (!trimmed) return;
    const origins = apiDraft.allowed_origins as string[];
    if (!origins.includes(trimmed)) updateApi('allowed_origins', [...origins, trimmed]);
    setNewOriginInput('');
  };
  const removeOrigin = (o: string) =>
    updateApi('allowed_origins', (apiDraft.allowed_origins as string[]).filter((x) => x !== o));

  const handleSave = () => {
    startTransition(async () => {
      const slug = form.slug || autoSlug(form.name);
      const public_slug = form.public_slug || slug;

      const result = await upsertSearchApp({
        id: form.id,
        project_id: projectId,
        environment_id: environmentId,
        name: form.name,
        slug,
        public_slug,
        provider: form.provider,
        gcp_project_id: form.gcp_project_id,
        location: form.location,
        collection_id: form.collection_id,
        engine_id: form.engine_id,
        serving_config_id: form.serving_config_id,
        credentials_json: form.credentials_json || null,
        page_size: form.page_size,
        page_size_max: form.page_size_max,
        enabled: form.enabled,
      });
      if (!result.success) { toast.error(result.error.message); return; }

      const settingsResult = await upsertSearchAppApiSettings({
        ...apiDraft,
        project_id: projectId,
        environment_id: environmentId,
        search_app_id: result.data.id,
      });
      if (!settingsResult.success) { toast.error(settingsResult.error.message); return; }

      toast.success('Search app saved.');
      notifyDemosSidebar();
      onSaved(result.data, settingsResult.data);
    });
  };

  return (
    <>
      <DialogHeader className="pb-2">
        <DialogTitle>Edit — {app.name}</DialogTitle>
        <DialogDescription>
          Update configuration and security settings.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="general" className="w-full">
        {/* Tab bar — full width */}
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
          <TabsTrigger value="google-cloud" className="flex-1">Google Cloud</TabsTrigger>
          <TabsTrigger value="security" className="flex-1">Security</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: General ── */}
        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="space-y-1">
            <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
            <Input id="edit-name" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-slug" className="text-sm font-medium">Slug</label>
              <Input id="edit-slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
              <p className="text-xs text-muted-foreground">Internal identifier.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-public-slug" className="text-sm font-medium">Public slug</label>
              <Input id="edit-public-slug" value={form.public_slug} onChange={(e) => update('public_slug', e.target.value)} />
              <p className="text-xs text-muted-foreground">Used in the public API URL.</p>
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Endpoint:{' '}
              <span className="font-mono">{buildSearchEndpoint(form.public_slug)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-provider" className="text-sm font-medium">Provider</label>
            <Select
              value={form.provider}
              onValueChange={(v) => update('provider', v as SearchProvider)}
            >
              <SelectTrigger id="edit-provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEARCH_PROVIDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumericField
              label="Default page size"
              hint="Results returned per request"
              value={form.page_size}
              min={1} max={100}
              onChange={(v) => update('page_size', v)}
            />
            <NumericField
              label="Max page size"
              hint="Upper bound the frontend can request"
              value={form.page_size_max}
              min={1} max={100}
              onChange={(v) => update('page_size_max', v)}
            />
          </div>

          <ToggleRow
            title="Enabled"
            description="When disabled the endpoint returns 404."
            checked={form.enabled}
            onCheckedChange={(v) => update('enabled', v)}
          />
        </TabsContent>

        {/* ── Tab 2: Google Cloud ── */}
        <TabsContent value="google-cloud" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-gcp-project" className="text-sm font-medium">GCP Project ID</label>
              <Input
                id="edit-gcp-project"
                placeholder="my-gcp-project"
                value={form.gcp_project_id}
                onChange={(e) => update('gcp_project_id', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-location" className="text-sm font-medium">Location</label>
              <Select value={form.location} onValueChange={(v) => update('location', normalizeSearchLocation(v))}>
                <SelectTrigger id="edit-location"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">global</SelectItem>
                  <SelectItem value="us">us</SelectItem>
                  <SelectItem value="eu">eu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-engine-id" className="text-sm font-medium">Engine (App) ID</label>
            <Input
              id="edit-engine-id"
              placeholder="my-app_1783421988477"
              value={form.engine_id}
              onChange={(e) => update('engine_id', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Google Cloud Console → AI Applications → your app → <strong>ID</strong> column.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit-serving-config" className="text-sm font-medium">Serving Config ID</label>
              <Input
                id="edit-serving-config"
                placeholder="default_search"
                value={form.serving_config_id}
                onChange={(e) => update('serving_config_id', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-collection-id" className="text-sm font-medium">Collection ID</label>
              <Input
                id="edit-collection-id"
                placeholder="default_collection"
                value={form.collection_id}
                onChange={(e) => update('collection_id', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Resulting path:{' '}
            <span className="font-mono break-all">
              {`projects/${form.gcp_project_id || '<project>'}/locations/${form.location}/collections/${form.collection_id}/engines/${form.engine_id || '<engine-id>'}/servingConfigs/${form.serving_config_id}`}
            </span>
          </div>
        </TabsContent>

        {/* ── Tab 3: Security ── */}
        <TabsContent value="security" className="pt-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">

            {/* ── Google Cloud Credentials — full width ── */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Google Cloud Credentials
                </p>
                {/* Show configured status from has_credentials (never expose raw value) */}
                {app.has_credentials && !form.credentials_json ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Credentials configured — paste new JSON to replace
                  </span>
                ) : form.credentials_json && (() => {
                  try {
                    const p = JSON.parse(form.credentials_json);
                    return p?.client_email ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {p.client_email}
                      </span>
                    ) : null;
                  } catch { return null; }
                })()}
              </div>
              <textarea
                id="edit-credentials-json"
                aria-label="Google Cloud service account JSON key"
                rows={4}
                placeholder={
                  app.has_credentials
                    ? 'Credentials already configured. Paste new JSON here to replace them, or leave blank to keep the existing credentials.'
                    : 'Paste the full service account JSON key here:\n{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "...@....iam.gserviceaccount.com"\n}'
                }
                value={form.credentials_json}
                onChange={(e) => update('credentials_json', e.target.value)}
                className="w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                spellCheck={false}
              />
              {form.credentials_json && (() => {
                try { JSON.parse(form.credentials_json); return null; }
                catch { return <p className="text-xs text-destructive">Invalid JSON — check for missing quotes or commas.</p>; }
              })()}
              <p className="text-xs text-muted-foreground">
                Download from Google Cloud Console → IAM &amp; Admin → Service Accounts → Keys.
                The service account must have the <strong>Discovery Engine Viewer</strong> role.
                Credentials are <strong>encrypted at rest</strong> using AES-256-GCM.
                {form.credentials_json && (
                  <button
                    type="button"
                    onClick={() => update('credentials_json', '')}
                    className="ml-2 text-destructive hover:underline"
                  >
                    Clear new input
                  </button>
                )}
              </p>
            </div>

            <Separator className="col-span-2" />

            {/* ── Allowed Origins ── */}
            <div className="col-span-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Allowed Origins (CORS)
              </p>
              <div className="flex gap-2">
                <Input
                  id="edit-allowed-origin-input"
                  aria-label="New allowed origin"
                  placeholder="https://example.com — press Enter to add"
                  value={newOriginInput}
                  onChange={(e) => setNewOriginInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOrigin())}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addOrigin}>Add</Button>
              </div>
              {(apiDraft.allowed_origins as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(apiDraft.allowed_origins as string[]).map((origin) => (
                    <Badge key={origin} variant="secondary" className="flex items-center gap-1 text-xs">
                      {origin}
                      <button type="button" onClick={() => removeOrigin(origin)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Empty — all origins allowed.</p>
              )}
            </div>

            <Separator className="col-span-2" />

            {/* ── Rate Limiting (left) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rate Limiting</p>
                <Switch checked={apiDraft.rate_limit_enabled} onCheckedChange={(v) => updateApi('rate_limit_enabled', v)} />
              </div>
              {apiDraft.rate_limit_enabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="edit-rl-max-requests" className="text-xs text-muted-foreground">Max requests</label>
                      <Input id="edit-rl-max-requests" type="number" min={1} max={10000} value={apiDraft.rate_limit_max_requests} onChange={(e) => updateApi('rate_limit_max_requests', Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-rl-window" className="text-xs text-muted-foreground">Window (s)</label>
                      <Input id="edit-rl-window" type="number" min={1} max={86400} value={apiDraft.rate_limit_window_seconds} onChange={(e) => updateApi('rate_limit_window_seconds', Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                  </div>
              )}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground font-medium">Identity sources</p>
                <label className="flex items-center justify-between text-sm">
                  <span>IP address</span>
                  <Switch checked={apiDraft.rate_limit_use_ip} onCheckedChange={(v) => updateApi('rate_limit_use_ip', v)} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Session cookie</span>
                  <Switch checked={apiDraft.rate_limit_use_session_cookie} onCheckedChange={(v) => updateApi('rate_limit_use_session_cookie', v)} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Custom header</span>
                  <Switch checked={apiDraft.rate_limit_use_fingerprint} onCheckedChange={(v) => updateApi('rate_limit_use_fingerprint', v)} />
                </label>
                  {apiDraft.rate_limit_use_fingerprint && (
                    <Input
                      id="edit-fingerprint-header"
                      aria-label="Custom fingerprint header name"
                      placeholder="x-client-fingerprint"
                    value={apiDraft.fingerprint_header_name}
                    onChange={(e) => updateApi('fingerprint_header_name', e.target.value)}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            </div>

            {/* ── Right column: Query + Session + Temp Blocks ── */}
            <div className="space-y-4">
              {/* Query Size Limits */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Query Size</p>
                  <Switch checked={apiDraft.query_size_limit_enabled} onCheckedChange={(v) => updateApi('query_size_limit_enabled', v)} />
                </div>
                {apiDraft.query_size_limit_enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="edit-qs-max-chars" className="text-xs text-muted-foreground">Max chars</label>
                        <Input id="edit-qs-max-chars" type="number" min={1} max={10000} value={apiDraft.max_query_characters} onChange={(e) => updateApi('max_query_characters', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-qs-max-body" className="text-xs text-muted-foreground">Max body (bytes)</label>
                        <Input id="edit-qs-max-body" type="number" min={1} max={100000} value={apiDraft.max_request_body_bytes} onChange={(e) => updateApi('max_request_body_bytes', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                )}
              </div>

              {/* Session Cap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session Cap</p>
                  <Switch checked={apiDraft.session_request_cap_enabled} onCheckedChange={(v) => updateApi('session_request_cap_enabled', v)} />
                </div>
                {apiDraft.session_request_cap_enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="edit-sc-max-requests" className="text-xs text-muted-foreground">Max requests</label>
                        <Input id="edit-sc-max-requests" type="number" min={1} max={100000} value={apiDraft.session_request_cap_max_requests} onChange={(e) => updateApi('session_request_cap_max_requests', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-sc-window" className="text-xs text-muted-foreground">Window (s)</label>
                        <Input id="edit-sc-window" type="number" min={1} max={604800} value={apiDraft.session_request_cap_window_seconds} onChange={(e) => updateApi('session_request_cap_window_seconds', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                )}
              </div>

              {/* Temporary Blocks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Temporary Blocks</p>
                  <Switch checked={apiDraft.temporary_block_enabled} onCheckedChange={(v) => updateApi('temporary_block_enabled', v)} />
                </div>
                {apiDraft.temporary_block_enabled && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="edit-tb-threshold" className="text-xs text-muted-foreground">Threshold</label>
                        <Input id="edit-tb-threshold" type="number" min={1} max={1000} value={apiDraft.temporary_block_violation_threshold} onChange={(e) => updateApi('temporary_block_violation_threshold', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-tb-window" className="text-xs text-muted-foreground">Window (s)</label>
                        <Input id="edit-tb-window" type="number" min={1} max={604800} value={apiDraft.temporary_block_window_seconds} onChange={(e) => updateApi('temporary_block_window_seconds', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-tb-duration" className="text-xs text-muted-foreground">Duration (s)</label>
                        <Input id="edit-tb-duration" type="number" min={1} max={604800} value={apiDraft.temporary_block_duration_seconds} onChange={(e) => updateApi('temporary_block_duration_seconds', Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                )}
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Search app card with inline blocks panel
// ---------------------------------------------------------------------------

function formatBlockTime(seconds: number): string {
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return `${seconds}s`;
}

function SearchAppCard({
  app,
  projectId,
  onEdit,
  onDelete,
}: {
  app: SearchApp;
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [blockStatus, setBlockStatus] = useState<SearchAppBlockStatus | null>(null);
  const [isLoadingBlocks, startBlocksTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();

  const loadBlocks = useCallback(() => {
    startBlocksTransition(async () => {
      const result = await getSearchAppBlocks(projectId, app.public_slug);
      if (result.success) setBlockStatus(result.data);
      else toast.error(result.error.message);
    });
  }, [projectId, app.public_slug]);

  const handleToggleBlocks = () => {
    if (!blocksOpen) loadBlocks();
    setBlocksOpen((v) => !v);
  };

  const handleClearAll = () => {
    startClearTransition(async () => {
      const result = await clearSearchAppBlocks(projectId, app.public_slug);
      if (result.success) {
        toast.success(
          result.data.cleared > 0
            ? `Cleared ${result.data.cleared} block key${result.data.cleared !== 1 ? 's' : ''}.`
            : 'No active blocks to clear.',
        );
        loadBlocks();
      } else {
        toast.error(result.error.message);
      }
    });
  };

  const activeBlocks = blockStatus?.blocks ?? [];

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Main card row */}
      <div className="flex items-start justify-between p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{app.name}</span>
            <Badge
              variant="outline"
              className={`text-xs ${SEARCH_PROVIDER_BADGE_STYLES[app.provider]}`}
            >
              {getSearchProviderLabel(app.provider)}
            </Badge>
            {!app.enabled && (
              <Badge variant="secondary" className="text-xs">Disabled</Badge>
            )}
            {/* Blocks indicator — only shown once loaded */}
            {blockStatus && activeBlocks.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <Shield className="h-3 w-3" />
                {activeBlocks.length} block{activeBlocks.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground font-mono">
            {buildSearchEndpoint(app.public_slug)}
          </p>
          <p className="text-xs text-muted-foreground">
            Page size: {app.page_size} (max {app.page_size_max})
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {/* Blocks toggle */}
          <Button
            variant="ghost"
            size="icon"
            title="View active blocks"
            onClick={handleToggleBlocks}
          >
            <Shield className={`h-4 w-4 ${blocksOpen ? 'text-primary' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Blocks panel */}
      {blocksOpen && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Active blocks
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={isLoadingBlocks}
                onClick={loadBlocks}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingBlocks ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {activeBlocks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  disabled={isClearing}
                  onClick={handleClearAll}
                >
                  {isClearing ? 'Clearing…' : 'Clear all'}
                </Button>
              )}
            </div>
          </div>

          {isLoadingBlocks && !blockStatus && (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}

          {blockStatus && activeBlocks.length === 0 && (
            <p className="text-xs text-muted-foreground">No active blocks.</p>
          )}

          {activeBlocks.length > 0 && (
            <div className="space-y-1">
              {activeBlocks.map((block) => (
                <div
                  key={block.key}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5"
                >
                  <span className="text-xs font-mono text-muted-foreground truncate flex-1 mr-2">
                    {block.key}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-destructive/40 text-destructive shrink-0"
                  >
                    {formatBlockTime(block.resetSeconds)} remaining
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main manager
// ---------------------------------------------------------------------------

export function SearchesManager({
  projectId,
  environmentId,
  searchApps,
  apiSettings,
}: SearchesManagerProps) {
  const [items, setItems] = useState(searchApps);
  const [apiSettingsState, setApiSettingsState] = useState(apiSettings);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<SearchApp | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SearchApp | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, startDeleteTransition] = useTransition();

  const closeDialog = () => { setDialogMode(null); setEditTarget(null); };

  const handleCreated = (app: SearchApp, settings?: SearchAppApiSettings) => {
    setItems((prev) => [...prev, app]);
    if (settings) setApiSettingsState((prev) => [...prev, settings]);
    notifyDemosSidebar();
    closeDialog();
  };

  const handleSaved = (app: SearchApp, settings?: SearchAppApiSettings) => {
    setItems((prev) => prev.map((item) => (item.id === app.id ? app : item)));
    if (settings) {
      setApiSettingsState((prev) => {
        const idx = prev.findIndex((s) => s.search_app_id === app.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = settings; return next; }
        return [...prev, settings];
      });
    }
    closeDialog();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const result = await deleteSearchApp(projectId, deleteTarget.id);
      if (!result.success) { toast.error(result.error.message); return; }
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setApiSettingsState((prev) => prev.filter((s) => s.search_app_id !== deleteTarget.id));
      toast.success('Search app deleted.');
      notifyDemosSidebar();
      setDeleteTarget(null);
      setDeleteConfirmation('');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Search Applications</h2>
          <p className="text-sm text-muted-foreground">
            Manage Vertex AI Agent Search endpoints for this environment.
          </p>
        </div>
        <Button onClick={() => setDialogMode('create')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Search App
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No search applications yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((app) => (
            <SearchAppCard
              key={app.id}
              app={app}
              projectId={projectId}
              onEdit={() => { setEditTarget(app); setDialogMode('edit'); }}
              onDelete={() => { setDeleteTarget(app); setDeleteConfirmation(''); }}
            />
          ))}
        </div>
      )}

      {/* Create wizard */}
      <Dialog open={dialogMode === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <CreateWizard
            projectId={projectId}
            environmentId={environmentId}
            onClose={closeDialog}
            onCreated={handleCreated}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={dialogMode === 'edit' && editTarget !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {editTarget && (
            <EditForm
              key={editTarget.id}
              app={editTarget}
              existingSettings={apiSettingsState.find((s) => s.search_app_id === editTarget.id)}
              projectId={projectId}
              environmentId={environmentId}
              onClose={closeDialog}
              onSaved={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => { setDeleteTarget(null); setDeleteConfirmation(''); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Search App</DialogTitle>
            <DialogDescription>
              This will permanently delete{' '}
              <span className="font-medium">{deleteTarget?.name}</span> and its API settings.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Type <span className="font-mono font-medium">{deleteTarget?.name}</span> to confirm.
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={deleteTarget?.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmation !== deleteTarget?.name || isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
