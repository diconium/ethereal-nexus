'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  LoaderCircle,
  MinusCircle,
  PlugZap,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cmsLogoByKey } from './cms-logos';
import {
  getCmsConnectorLabel,
  SECRET_PLACEHOLDER,
  type CmsConnectorConfig,
} from '@/data/cms/config';
import { listManifests } from '@/data/cms/manifest';
import {
  getValidationTasks,
  getCapabilityProbeLabels,
  DISCOVERY_SCOPE_META,
} from '@/data/cms/task-metadata';
import { CAPABILITY_LABELS } from '@/data/cms/capabilities';
import {
  buildBlueprint,
  discoverCapabilities,
  discoverProjectsForConfig,
  getCmsConnectionConfig,
  upsertCmsConnection,
  validateCmsConnection,
} from '@/data/cms/actions';
import type { Capability, DiscoveryScope, Project } from '@/data/cms/types';
import type { CmsConnectorKey } from '@/data/cms/config';

type WizardStep =
  | 'choose'
  | 'form'
  | 'validate'
  | 'capabilities'
  | 'scope'
  | 'building';

type CheckRow = {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning' | 'skipped';
  message?: string;
};

type FormState = {
  name: string;
  role: 'source' | 'target' | 'general';
  authorUrl: string;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  project: string;
  extraAppPaths: string;
  timeoutMs: string;
  allowSelfSignedSsl: boolean;
  serverUrl: string;
  apiToken: string;
  fsServerUrl: string;
  fsUsername: string;
  fsPassword: string;
  cfDeliveryToken: string;
  cfManagementToken: string;
  cfApiHost: string;
  cfSpaceId: string;
  cfEnvironment: string;
};

const emptyForm: FormState = {
  name: '',
  role: 'general',
  authorUrl: '',
  username: '',
  password: '',
  clientId: '',
  clientSecret: '',
  project: '',
  extraAppPaths: '',
  timeoutMs: '30000',
  allowSelfSignedSsl: false,
  serverUrl: '',
  apiToken: '',
  fsServerUrl: '',
  fsUsername: '',
  fsPassword: '',
  cfDeliveryToken: '',
  cfManagementToken: '',
  cfApiHost: 'https://api.contentful.com',
  cfSpaceId: '',
  cfEnvironment: 'master',
};

/** Redacted secret placeholder shown as blank in the form. */
function unredact(value: unknown): string {
  const s = typeof value === 'string' ? value : '';
  return s === SECRET_PLACEHOLDER ? '' : s;
}

/**
 * Map a (redacted) connection config back into the flat FormState for editing.
 * Secret fields arrive as the keep-placeholder and are shown blank.
 */
function configToForm(
  provider: CmsConnectorKey,
  config: Record<string, unknown>,
): { form: FormState; authMethod: 'basic' | 'oauth' } {
  const form: FormState = { ...emptyForm };
  const str = (k: string) => (typeof config[k] === 'string' ? (config[k] as string) : '');
  form.name = str('name');
  let authMethod: 'basic' | 'oauth' = 'basic';

  if (provider === 'aem') {
    form.authorUrl = str('authorUrl');
    form.project = str('project');
    const extra = config.extraAppPaths;
    form.extraAppPaths = Array.isArray(extra) ? extra.join(', ') : '';
    form.timeoutMs = String((config.timeoutMs as number) ?? 30000);
    form.allowSelfSignedSsl = config.allowSelfSignedSsl === true;
    const auth = (config.auth ?? {}) as Record<string, unknown>;
    if (auth.method === 'oauth') {
      authMethod = 'oauth';
      form.clientId = typeof auth.clientId === 'string' ? auth.clientId : '';
      form.clientSecret = unredact(auth.clientSecret);
    } else {
      authMethod = 'basic';
      form.username = typeof auth.username === 'string' ? auth.username : '';
      form.password = unredact(auth.password);
    }
  } else if (provider === 'strapi') {
    form.serverUrl = str('serverUrl');
    form.apiToken = unredact(config.apiToken);
  } else if (provider === 'firstspirit') {
    form.fsServerUrl = str('serverUrl');
    form.fsUsername = str('username');
    form.fsPassword = unredact(config.password);
  } else if (provider === 'contentful') {
    form.cfDeliveryToken = unredact(config.deliveryToken);
    form.cfManagementToken = unredact(config.managementToken);
    form.cfApiHost = str('apiHost') || 'https://api.contentful.com';
    form.cfSpaceId = str('spaceId');
    form.cfEnvironment = str('environment') || 'master';
  }

  return { form, authMethod };
}

export function AddCmsDialog({
  open,
  onOpenChange,
  projectId,
  environmentId,
  onSaved,
  editConnectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string | null;
  onSaved?: () => void;
  /** When set, the dialog opens in edit mode for this connection. */
  editConnectionId?: string | null;
}) {
  const [step, setStep] = useState<WizardStep>('choose');
  const [selectedCms, setSelectedCms] = useState<CmsConnectorKey | null>(null);
  const [authMethod, setAuthMethod] = useState<'basic' | 'oauth'>('basic');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = !!editConnectionId;
  const [loadingEdit, setLoadingEdit] = useState(false);

  // validation
  const [tasks, setTasks] = useState<CheckRow[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [validationOk, setValidationOk] = useState(false);

  // capabilities
  const [caps, setCaps] = useState<CheckRow[]>([]);
  const [capsRunning, setCapsRunning] = useState(false);
  const [capsDone, setCapsDone] = useState(false);

  // projects (picked in the connection form for AEM)
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [discoverAttempted, setDiscoverAttempted] = useState(false);

  // scope
  const [scopeSelection, setScopeSelection] = useState<Record<string, boolean>>(
    Object.fromEntries(DISCOVERY_SCOPE_META.map((s) => [s.scope, s.defaultChecked])),
  );

  // building
  const [buildTasks, setBuildTasks] = useState<CheckRow[]>([]);
  const [building, setBuilding] = useState(false);
  const [buildDone, setBuildDone] = useState(false);
  const [buildSummary, setBuildSummary] = useState<{ nodes: number; changes: number } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const t = setTimeout(() => {
        setStep('choose');
        setSelectedCms(null);
        setAuthMethod('basic');
        setForm(emptyForm);
        setConnectionId(null);
        setSaving(false);
        setTasks([]);
        setValidating(false);
        setValidationDone(false);
        setValidationOk(false);
        setCaps([]);
        setCapsRunning(false);
        setCapsDone(false);
        setProjects([]);
        setLoadingProjects(false);
        setProjectsError(null);
        setDiscoverAttempted(false);
        setScopeSelection(
          Object.fromEntries(DISCOVERY_SCOPE_META.map((s) => [s.scope, s.defaultChecked])),
        );
        setBuildTasks([]);
        setBuilding(false);
        setBuildDone(false);
        setBuildSummary(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Edit mode: when opened with a connection id, load + prefill the form.
  useEffect(() => {
    if (!open || !editConnectionId) return;
    let cancelled = false;
    setLoadingEdit(true);
    (async () => {
      const res = await getCmsConnectionConfig(editConnectionId);
      if (cancelled) return;
      setLoadingEdit(false);
      if (!res.success) {
        toast.error(res.error.message);
        onOpenChange(false);
        return;
      }
      const { form: prefilled, authMethod: am } = configToForm(
        res.data.provider,
        res.data.config,
      );
      setSelectedCms(res.data.provider);
      setAuthMethod(am);
      // Restore the saved role — configToForm only processes the encrypted config blob,
      // so role must be applied from the top-level action response.
      setForm({ ...prefilled, role: (res.data.role as FormState['role']) ?? 'general' });
      setConnectionId(editConnectionId);
      setStep('form');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editConnectionId]);

  const manifests = listManifests();
  const manifest = selectedCms ? manifests.find((m) => m.id === selectedCms) : null;
  const ProviderLogo = selectedCms ? cmsLogoByKey[selectedCms] : null;

  function buildConfig(): CmsConnectorConfig | null {
    if (!selectedCms) return null;
    // When editing and a secret is left blank, send the keep-placeholder so the
    // server preserves the stored value instead of clearing it.
    const secret = (value: string) =>
      isEditing && !value.trim() ? SECRET_PLACEHOLDER : value;
    if (selectedCms === 'aem') {
      return {
        name: form.name,
        authorUrl: form.authorUrl,
        auth:
          authMethod === 'basic'
            ? { method: 'basic', username: form.username, password: secret(form.password) }
            : { method: 'oauth', clientId: form.clientId, clientSecret: secret(form.clientSecret) },
        project: form.project,
        extraAppPaths: form.extraAppPaths
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        assetPaths: [],
        timeoutMs: Number(form.timeoutMs) || 30000,
        allowSelfSignedSsl: form.allowSelfSignedSsl,
      };
    }
    if (selectedCms === 'strapi') {
      return { name: form.name, serverUrl: form.serverUrl, apiToken: secret(form.apiToken) };
    }
    if (selectedCms === 'firstspirit') {
      return {
        name: form.name,
        serverUrl: form.fsServerUrl,
        username: form.fsUsername,
        password: secret(form.fsPassword),
      };
    }
    if (selectedCms === 'contentful') {
      return {
        name: form.name,
        deliveryToken: secret(form.cfDeliveryToken),
        managementToken: secret(form.cfManagementToken),
        deliveryHost: 'https://cdn.contentful.com',
        apiHost: form.cfApiHost.trim() || 'https://api.contentful.com',
        usePreview: false,
        spaceId: form.cfSpaceId,
        environment: form.cfEnvironment.trim() || 'master',
        timeoutMs: 30000,
      };
    }
    return null;
  }

  function isFormValid() {
    if (!selectedCms || !form.name.trim()) return false;
    // In edit mode, a blank secret means "keep current" — so secrets are
    // optional; only non-secret required fields are enforced.
    const secretOk = (value: string) => isEditing || !!value.trim();
    if (selectedCms === 'aem') {
      if (!form.authorUrl.trim() || !form.project.trim()) return false;
      return authMethod === 'basic'
        ? !!form.username.trim() && secretOk(form.password)
        : !!form.clientId.trim() && secretOk(form.clientSecret);
    }
    if (selectedCms === 'strapi')
      return !!form.serverUrl.trim() && secretOk(form.apiToken);
    if (selectedCms === 'firstspirit')
      return (
        !!form.fsServerUrl.trim() &&
        !!form.fsUsername.trim() &&
        secretOk(form.fsPassword)
      );
    if (selectedCms === 'contentful')
      return secretOk(form.cfDeliveryToken) && !!form.cfSpaceId.trim();
    return false;
  }

  /* ------------------------------ actions ------------------------------ */

  async function handleValidate() {
    if (!selectedCms) return;
    const config = buildConfig();
    if (!config) return;

    setSaving(true);
    const saved = await upsertCmsConnection({
      id: connectionId ?? undefined,
      project_id: projectId,
      environment_id: environmentId,
      provider: selectedCms,
      role: form.role,
      config,
    });
    setSaving(false);
    if (!saved.success) {
      toast.error(saved.error.message);
      return;
    }
    setConnectionId(saved.data.id);

    setStep('validate');
    setValidating(true);
    setValidationDone(false);
    setValidationOk(false);
    const meta = getValidationTasks(selectedCms);
    setTasks(meta.map((t, i) => ({ id: `v${i}`, label: t.name, description: t.description, status: 'pending' })));

    const result = await validateCmsConnection(saved.data.id);
    if (!result.success) {
      toast.error(result.error.message);
      setValidating(false);
      return;
    }
    const serverTasks = result.data.tasks;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTasks(serverTasks.map((t, i) => ({ id: `v${i}`, label: t.name, description: t.description, status: 'pending' })));
    let stepN = 0;
    serverTasks.forEach((task, index) => {
      if (task.status === 'skipped') {
        timers.current.push(setTimeout(() => {
          setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, status: 'skipped' } : t)));
        }, stepN * 300));
        return;
      }
      const at = stepN * 300;
      stepN += 1;
      timers.current.push(setTimeout(() => {
        setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, status: 'running' } : t)));
      }, at));
      timers.current.push(setTimeout(() => {
        setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, status: task.status, message: task.message } : t)));
      }, at + 180));
    });
    const ran = serverTasks.filter((t) => t.status !== 'skipped').length;
    timers.current.push(setTimeout(() => {
      setValidating(false);
      setValidationDone(true);
      setValidationOk(result.data.ok);
      if (result.data.ok) toast.success('Validation passed.');
      else toast.error('Validation failed.');
    }, ran * 300 + 300));
  }

  async function handleCapabilities() {
    if (!selectedCms || !connectionId) return;
    setStep('capabilities');
    setCapsRunning(true);
    setCapsDone(false);
    const meta = getCapabilityProbeLabels(selectedCms);
    setCaps(meta.map((m, i) => ({ id: `c${i}`, label: m.name, status: 'pending' })));

    const result = await discoverCapabilities(connectionId);
    if (!result.success) {
      toast.error(result.error.message);
      setCapsRunning(false);
      return;
    }
    const found: Capability[] = result.data.capabilities;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const rows: CheckRow[] = found.map((c, i) => ({
      id: `c${i}`,
      label: CAPABILITY_LABELS[c.key] ?? c.key,
      status: 'pending',
      message: c.detail,
      // remember supported flag via status later
    }));
    setCaps(rows.map((r) => ({ ...r, status: 'pending' })));
    found.forEach((cap, index) => {
      const at = index * 250;
      timers.current.push(setTimeout(() => {
        setCaps((prev) => prev.map((r, i) => (i === index ? { ...r, status: 'running' } : r)));
      }, at));
      timers.current.push(setTimeout(() => {
        setCaps((prev) => prev.map((r, i) => (i === index ? { ...r, status: cap.supported ? 'success' : 'warning', message: cap.detail } : r)));
      }, at + 150));
    });
    timers.current.push(setTimeout(() => {
      setCapsRunning(false);
      setCapsDone(true);
    }, found.length * 250 + 250));
  }

  /** Discover projects from the entered (unsaved) AEM connection details. */
  async function handleDiscoverProjects() {
    const config = buildConfig();
    if (!config) return;
    setLoadingProjects(true);
    setProjectsError(null);
    setDiscoverAttempted(true);
    setProjects([]);
    const result = await discoverProjectsForConfig(
      selectedCms!,
      config as unknown as Record<string, unknown>,
    );
    setLoadingProjects(false);
    if (!result.success) {
      setProjectsError(result.error.message);
      return;
    }
    setProjects(result.data);
    if (result.data.length > 0 && !form.project) {
      setField('project', result.data[0].id);
    }
  }

  function selectedScopes(): DiscoveryScope[] {
    return Object.entries(scopeSelection)
      .filter(([, v]) => v)
      .map(([k]) => k as DiscoveryScope);
  }

  async function handleBuild() {
    if (!connectionId || !selectedCms) return;
    setStep('building');
    setBuilding(true);
    setBuildDone(false);
    setBuildSummary(null);

    const scopes = selectedScopes();
    const scopeLabels = DISCOVERY_SCOPE_META.filter((s) => scopes.includes(s.scope));
    setBuildTasks(scopeLabels.map((s, i) => ({ id: `b${i}`, label: s.label, description: s.description, status: 'pending' })));

    const result = await buildBlueprint(connectionId, scopes);
    if (!result.success) {
      setBuilding(false);
      toast.error(result.error.message);
      return;
    }
    const serverTasks = result.data.tasks;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBuildTasks(serverTasks.map((t, i) => ({ id: `b${i}`, label: t.name, status: 'pending' })));
    serverTasks.forEach((task, index) => {
      const at = index * 300;
      timers.current.push(setTimeout(() => {
        setBuildTasks((prev) => prev.map((t, i) => (i === index ? { ...t, status: 'running' } : t)));
      }, at));
      timers.current.push(setTimeout(() => {
        setBuildTasks((prev) => prev.map((t, i) => (i === index ? {
          ...t,
          status: task.status === 'error' ? 'error' : 'success',
          message: typeof task.nodeCount === 'number' ? `${task.nodeCount} found` : task.message,
        } : t)));
      }, at + 180));
    });
    timers.current.push(setTimeout(() => {
      setBuilding(false);
      setBuildDone(true);
      setBuildSummary({ nodes: result.data.nodeTotal, changes: result.data.changeCount });
      toast.success('Blueprint built.');
    }, serverTasks.length * 300 + 300));
  }

  const scopeCount = selectedScopes().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {/* Edit mode: loading the existing connection config */}
        {loadingEdit && step !== 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Connection</DialogTitle>
              <DialogDescription>Loading connection details…</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-12">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        )}

        {/* Step 1 — choose (hidden while loading an edit) */}
        {step === 'choose' && !loadingEdit && (
          <>
            <DialogHeader>
              <DialogTitle>Add CMS</DialogTitle>
              <DialogDescription>Choose a CMS Platform</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {manifests.map((m) => {
                const isSelected = selectedCms === m.id;
                const Logo = cmsLogoByKey[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.available}
                    onClick={() => m.available && setSelectedCms(m.id)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors',
                      m.available ? 'cursor-pointer hover:border-primary/50' : 'cursor-not-allowed opacity-50',
                      isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                    )}
                  >
                    {!m.available && (
                      <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Soon
                      </span>
                    )}
                    <Logo className="size-12 text-2xl" />
                    <div>
                      <p className="text-sm font-medium leading-tight">{m.name}</p>
                      {m.vendor && <p className="text-xs text-muted-foreground">{m.vendor}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button disabled={!selectedCms} onClick={() => setStep('form')}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2 — form */}
        {step === 'form' && manifest && selectedCms && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                {ProviderLogo && <ProviderLogo className="size-10 text-xl" />}
                <div>
                  <DialogTitle>
                    {isEditing ? `Edit ${manifest.name}` : manifest.name}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? 'Update the connection. Leave token fields blank to keep the current values.'
                      : 'Configure the connection details.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Role selector — placed first per spec US2/AC1 */}
              <div className="space-y-1.5">
                <Label>Connection Role</Label>
                <div className="flex gap-3">
                  {(['source', 'target', 'general'] as const).map((r) => (
                    <label
                      key={r}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors',
                        form.role === r
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="sr-only"
                        checked={form.role === r}
                        onChange={() => setField('role', r)}
                      />
                      {r === 'source' ? 'Source' : r === 'target' ? 'Target' : 'General'}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.role === 'source'
                    ? 'Source connections are used for discovery and content export.'
                    : form.role === 'target'
                      ? 'Target connections are used for provisioning and content import.'
                      : 'General connections are not designated for a specific migration role.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="connection-name">Connection Name</Label>
                <Input id="connection-name" placeholder="e.g. STIHL Production" value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>

              {selectedCms === 'aem' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="author-url">Author URL</Label>
                    <Input id="author-url" placeholder="https://author.example.com" value={form.authorUrl} onChange={(e) => setField('authorUrl', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Authentication</Label>
                    <div className="flex flex-col gap-2">
                      {manifest.authentication.includes('basic') && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="radio" name="auth" checked={authMethod === 'basic'} onChange={() => setAuthMethod('basic')} className="size-4 accent-primary" />
                          Username / Password
                        </label>
                      )}
                      {manifest.authentication.includes('oauth') && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="radio" name="auth" checked={authMethod === 'oauth'} onChange={() => setAuthMethod('oauth')} className="size-4 accent-primary" />
                          OAuth
                        </label>
                      )}
                    </div>
                  </div>
                  {authMethod === 'basic' ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="admin" value={form.username} onChange={(e) => setField('username', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="client-id">OAuth Client ID</Label>
                        <Input id="client-id" value={form.clientId} onChange={(e) => setField('clientId', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="client-secret">Client Secret</Label>
                        <Input id="client-secret" type="password" placeholder="••••••••" value={form.clientSecret} onChange={(e) => setField('clientSecret', e.target.value)} />
                      </div>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox id="self-signed" checked={form.allowSelfSignedSsl} onCheckedChange={(v) => setField('allowSelfSignedSsl', v === true)} />
                    Allow Self Signed SSL
                  </label>

                  {/* Project selection — one connection scopes to one project. */}
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Label>Project</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          loadingProjects ||
                          !form.authorUrl.trim() ||
                          (authMethod === 'basic'
                            ? !form.username.trim() || !form.password.trim()
                            : !form.clientId.trim() || !form.clientSecret.trim())
                        }
                        onClick={handleDiscoverProjects}
                      >
                        {loadingProjects ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}{' '}
                        Discover Projects
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Discovery will be scoped to the selected project only.
                      Click &ldquo;Discover Projects&rdquo; to list them, or type
                      a project key below.
                    </p>
                    {projectsError && (
                      <p className="text-xs text-red-500">{projectsError}</p>
                    )}
                    {!loadingProjects &&
                      !projectsError &&
                      discoverAttempted &&
                      projects.length === 0 && (
                        <p className="text-xs text-amber-600">
                          No projects found under /content. Type the project key
                          manually below.
                        </p>
                      )}
                    {projects.length > 0 && (
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {projects.map((p) => (
                          <label
                            key={p.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm',
                              form.project === p.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border',
                            )}
                          >
                            <input
                              type="radio"
                              name="aem-project"
                              className="size-4 accent-primary"
                              checked={form.project === p.id}
                              onChange={() => setField('project', p.id)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{p.name}</span>
                              {p.description && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {p.description}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="project-key" className="text-xs text-muted-foreground">
                        Project key {projects.length > 0 ? '(or type manually)' : ''}
                      </Label>
                      <Input
                        id="project-key"
                        placeholder="e.g. stihl"
                        value={form.project}
                        onChange={(e) => setField('project', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="extra-apps" className="text-xs text-muted-foreground">
                      Extra shared component paths (optional)
                    </Label>
                    <Input
                      id="extra-apps"
                      placeholder="e.g. /apps/shared-lib, /apps/wcm/foundation"
                      value={form.extraAppPaths}
                      onChange={(e) => setField('extraAppPaths', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated. Shared components referenced by your
                      project are also inferred automatically.
                    </p>
                  </div>
                </>
              )}

              {selectedCms === 'strapi' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="server-url">Server URL</Label>
                    <Input id="server-url" placeholder="https://cms.example.com" value={form.serverUrl} onChange={(e) => setField('serverUrl', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="api-token">API Token</Label>
                    <Input id="api-token" type="password" placeholder="••••••••" value={form.apiToken} onChange={(e) => setField('apiToken', e.target.value)} />
                  </div>
                </>
              )}

              {selectedCms === 'firstspirit' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fs-server-url">Server URL</Label>
                    <Input id="fs-server-url" placeholder="https://firstspirit.example.com" value={form.fsServerUrl} onChange={(e) => setField('fsServerUrl', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="fs-username">Username</Label>
                      <Input id="fs-username" value={form.fsUsername} onChange={(e) => setField('fsUsername', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fs-password">Password</Label>
                      <Input id="fs-password" type="password" placeholder="••••••••" value={form.fsPassword} onChange={(e) => setField('fsPassword', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {selectedCms === 'contentful' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-delivery-token">
                      Content Delivery API Token
                    </Label>
                    <Input
                      id="cf-delivery-token"
                      type="password"
                      placeholder="••••••••"
                      value={form.cfDeliveryToken}
                      onChange={(e) => setField('cfDeliveryToken', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      From Settings → API keys → “Content Delivery / Preview API
                      — access token”. Used for discovery (read-only). Stored
                      encrypted.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cf-space">Space</Label>
                      <Input
                        id="cf-space"
                        placeholder="Space ID"
                        value={form.cfSpaceId}
                        onChange={(e) => setField('cfSpaceId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cf-env">Environment</Label>
                      <Input
                        id="cf-env"
                        placeholder="master"
                        value={form.cfEnvironment}
                        onChange={(e) => setField('cfEnvironment', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-token">
                      Management Token{' '}
                      <span className="text-muted-foreground">
                        (optional — required to provision)
                      </span>
                    </Label>
                    <Input
                      id="cf-token"
                      type="password"
                      placeholder="CFPAT-••••••••"
                      value={form.cfManagementToken}
                      onChange={(e) => setField('cfManagementToken', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A Personal Access Token (Settings → CMA tokens). Only
                      needed to create content types in Contentful.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => (isEditing ? onOpenChange(false) : setStep('choose'))}
              >
                <ArrowLeft className="size-4" /> {isEditing ? 'Cancel' : 'Back'}
              </Button>
              <Button disabled={saving || !isFormValid()} onClick={handleValidate}>
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />} Validate Connection
              </Button>
            </div>
          </>
        )}

        {/* Step 3 — validate */}
        {step === 'validate' && (
          <>
            <DialogHeader>
              <DialogTitle>Connection Validation</DialogTitle>
              <DialogDescription>
                {selectedCms ? `Verifying ${getCmsConnectorLabel(selectedCms)} connectivity and access.` : 'Verifying connectivity and access.'}
              </DialogDescription>
            </DialogHeader>
            <CheckList rows={tasks} running={validating} />
            {validationDone && (validationOk ? (
              <Banner tone="success"><CheckCircle2 className="size-4" /> Ready</Banner>
            ) : (
              <Banner tone="error">
                <div className="flex items-center gap-2 font-medium"><CircleAlert className="size-4" /> Connection failed</div>
                <p className="mt-1 text-xs">Fix the failed checks and re-run validation.</p>
              </Banner>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('form')} disabled={validating}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <div className="flex gap-2">
                {validationDone && !validationOk && (
                  <Button variant="outline" onClick={handleValidate}><PlugZap className="size-4" /> Retry</Button>
                )}
                <Button disabled={!validationDone || !validationOk} onClick={handleCapabilities}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 4 — capabilities */}
        {step === 'capabilities' && (
          <>
            <DialogHeader>
              <DialogTitle>Capability Discovery</DialogTitle>
              <DialogDescription>Detecting what this connection supports. Reused later by mapping and migration.</DialogDescription>
            </DialogHeader>
            <CheckList rows={caps} running={capsRunning} />
            {capsDone && (
              <Banner tone="success"><CheckCircle2 className="size-4" /> Capabilities detected</Banner>
            )}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('validate')} disabled={capsRunning}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button disabled={!capsDone} onClick={() => setStep('scope')}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 5 — scope */}
        {step === 'scope' && (
          <>
            <DialogHeader>
              <DialogTitle>What would you like Nexus to discover?</DialogTitle>
              <DialogDescription>Nexus analyzes your CMS and builds a reusable Blueprint graph.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DISCOVERY_SCOPE_META.map((s) => {
                const checked = scopeSelection[s.scope];
                return (
                  <label key={s.scope} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors', checked ? 'border-primary/40 bg-primary/5' : 'border-border')}>
                    <Checkbox checked={checked} onCheckedChange={(v) => setScopeSelection((prev) => ({ ...prev, [s.scope]: v === true }))} />
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('capabilities')}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button disabled={scopeCount === 0} onClick={handleBuild}>
                <Sparkles className="size-4" /> Build Blueprint <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        )}

        {/* Step 6 — building */}
        {step === 'building' && (
          <>
            <DialogHeader>
              <DialogTitle>{buildDone ? 'Blueprint complete' : 'Building Blueprint…'}</DialogTitle>
              <DialogDescription>
                {buildDone ? 'Nexus built a knowledge graph from your CMS.' : 'Running discovery scopes and building the graph.'}
              </DialogDescription>
            </DialogHeader>
            <CheckList rows={buildTasks} running={building} />
            {buildDone && buildSummary && (
              <Banner tone="success">
                <CheckCircle2 className="size-4" /> {buildSummary.nodes.toLocaleString()} items · {buildSummary.changes.toLocaleString()} changes
              </Banner>
            )}
            <div className="flex items-center justify-end">
              <Button disabled={!buildDone} onClick={() => { onSaved?.(); onOpenChange(false); }}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- helpers UI ----------------------------- */

function CheckList({ rows, running }: { rows: CheckRow[]; running: boolean }) {
  return (
    <div className="max-h-[45vh] space-y-1 overflow-y-auto">
      {running && rows.every((r) => r.status === 'pending') && (
        <div className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Connecting…
        </div>
      )}
      {rows.map((row) => (
        <div key={row.id} className={cn('flex items-start gap-2.5 rounded-md px-1 py-1.5 text-sm', row.status === 'running' && 'bg-muted/40')}>
          <span className="mt-0.5 shrink-0">
            {row.status === 'success' && <CheckCircle2 className="size-4 text-green-600" />}
            {row.status === 'warning' && <CircleAlert className="size-4 text-amber-500" />}
            {row.status === 'error' && <CircleAlert className="size-4 text-red-500" />}
            {row.status === 'running' && <LoaderCircle className="size-4 animate-spin text-primary" />}
            {row.status === 'skipped' && <MinusCircle className="size-4 text-muted-foreground/40" />}
            {row.status === 'pending' && <span className="block size-4 rounded-full border border-muted-foreground/40" />}
          </span>
          <div className={cn('min-w-0 flex-1', row.status === 'skipped' && 'opacity-50')}>
            <div className="flex items-center justify-between gap-2">
              <span className={cn('font-medium', row.status === 'pending' && 'text-muted-foreground/60', row.status === 'error' && 'text-red-600', row.status === 'warning' && 'text-amber-600')}>
                {row.label}
              </span>
              {row.message && row.status !== 'pending' && (
                <span className={cn('shrink-0 text-xs', row.status === 'error' ? 'text-red-500' : row.status === 'warning' ? 'text-amber-500' : 'text-muted-foreground')}>
                  {row.message}
                </span>
              )}
            </div>
            {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border p-3 text-sm', tone === 'success' ? 'border-green-200 bg-green-50 font-medium text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400')}>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
