'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Script from 'next/script';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentAsset, ComponentVersion } from '@/data/components/dto';
import { ExternalLink, RefreshCcw, Copy, Bug } from 'lucide-react';
import { FieldRenderer } from '@ethereal-nexus/dialog-ui-example';
import { DialogField } from '@ethereal-nexus/dialog-ui-core';

interface PreviewContainerProps {
  componentSlug: string | null;
  componentAssets: ComponentAsset[];
  selectedVersion: ComponentVersion & { dialog?: DialogField[] };
  component: {
    data: {
      id: string;
      name: string;
      title?: string | null;
      description?: string | null;
    };
  };
}

type FieldValueMap = Record<string, any>;
type AssetKind = NonNullable<ComponentAsset['type']>;

const assetTypeLabels: Record<AssetKind | 'other', string> = {
  css: 'Stylesheet',
  js: 'JavaScript',
  chunk: 'Chunk',
  server: 'Server',
  other: 'Asset',
};

function getAssetTypeLabel(type: ComponentAsset['type'] | 'other') {
  if (!type) {
    return assetTypeLabels.other;
  }

  return assetTypeLabels[type as AssetKind] ?? assetTypeLabels.other;
}

const joinPath = (parent: string, current?: string | null) => {
  if (!current) {
    return parent;
  }
  return parent ? `${parent}.${current}` : current;
};

function extractDefaultValue(field: DialogField): any {
  const candidate =
    (field as any).default ??
    (field as any).defaultValue ??
    (field as any).value ??
    (field as any).initialValue;

  if (candidate !== undefined) {
    return candidate;
  }

  if (field.type === 'checkbox' || field.type === 'switch') {
    return false;
  }

  return '';
}

const formatAttributeValue = (value: any): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const getNestedValue = (source: FieldValueMap, path: string) => {
  if (!path) {
    return source;
  }

  return path.split('.').reduce<any>((current, key) => {
    if (current === undefined || current === null) {
      return undefined;
    }
    return current[key];
  }, source);
};

const setNestedValueMutable = (
  target: FieldValueMap,
  path: string,
  value: any,
) => {
  if (!path) {
    return;
  }

  const keys = path.split('.');
  let current = target;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }

    current = current[key];
  });
};

const setNestedValueImmutable = (
  source: FieldValueMap,
  path: string,
  value: any,
): FieldValueMap => {
  if (!path) {
    if (value && typeof value === 'object') {
      return value;
    }
    return source;
  }

  const [currentKey, ...restKeys] = path.split('.');
  const remainingPath = restKeys.join('.');

  return {
    ...source,
    [currentKey]: restKeys.length
      ? setNestedValueImmutable(
          typeof source?.[currentKey] === 'object' &&
            source[currentKey] !== null
            ? source[currentKey]
            : {},
          remainingPath,
          value,
        )
      : value,
  };
};

const flattenFieldValues = (
  values: FieldValueMap,
  prefix = '',
): Array<[string, any]> => {
  const entries: Array<[string, any]> = [];

  Object.entries(values ?? {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flattenFieldValues(value, path));
    } else {
      entries.push([path, value]);
    }
  });

  return entries;
};

const PreviewContainer: React.FC<PreviewContainerProps> = ({
  component,
  componentAssets = [],
  componentSlug,
  selectedVersion,
}) => {
  const dialogFields = useMemo<DialogField[]>(() => {
    if (Array.isArray(selectedVersion?.dialog)) {
      return selectedVersion.dialog as DialogField[];
    }
    return [];
  }, [selectedVersion?.dialog]);

  const cssAssetProxyUrls = useMemo(() => {
    return componentAssets
      .filter((asset) => asset.type === 'css' && asset.url)
      .map((asset) => `/api/proxy/css?url=${encodeURIComponent(asset.url)}`);
  }, [componentAssets]);

  const initialValues = useMemo<FieldValueMap>(() => {
    const defaults: FieldValueMap = {};

    const assignDefaults = (fields?: DialogField[], parentPath = '') => {
      if (!fields) {
        return;
      }

      fields.forEach((field) => {
        if (!field) {
          return;
        }

        const fieldType = field.type;
        const fieldName = field.name as string | undefined;

        if (fieldType === 'tabs') {
          assignDefaults(field.children as DialogField[], parentPath);
          return;
        }

        if (fieldType === 'tab') {
          assignDefaults(field.children as DialogField[], parentPath);
          return;
        }

        if (fieldType === 'group' || fieldType === 'fieldset') {
          const groupPath = fieldName
            ? joinPath(parentPath, fieldName)
            : parentPath;
          assignDefaults(field.children as DialogField[], groupPath);
          return;
        }

        if (!fieldName) {
          assignDefaults(field.children as DialogField[], parentPath);
          return;
        }

        const fieldPath = joinPath(parentPath, fieldName);
        setNestedValueMutable(defaults, fieldPath, extractDefaultValue(field));
      });
    };

    assignDefaults(dialogFields);
    return defaults;
  }, [dialogFields]);

  const [fieldValues, setFieldValues] = useState<FieldValueMap>(initialValues);
  const [copied, setCopied] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const previewElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFieldValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    const appendedLinks: HTMLLinkElement[] = [];

    cssAssetProxyUrls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      appendedLinks.push(link);
    });

    return () => {
      appendedLinks.forEach((link) => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [cssAssetProxyUrls]);

  const attributeEntries = useMemo(
    () => flattenFieldValues(fieldValues),
    [fieldValues],
  );

  const attributeString = useMemo(() => {
    return attributeEntries
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .map(([key, value]) => `${key}="${formatAttributeValue(value)}"`)
      .join(' ');
  }, [attributeEntries]);

  const snippet = useMemo(() => {
    if (!componentSlug) {
      return '';
    }

    const attrs = attributeString ? ` ${attributeString}` : '';
    const cssAttribute =
      cssAssetProxyUrls.length > 0
        ? ` data-css-urls='${JSON.stringify(cssAssetProxyUrls)}'`
        : '';

    return `<${componentSlug}${attrs}${cssAttribute}></${componentSlug}>`;
  }, [attributeString, componentSlug, cssAssetProxyUrls]);

  useEffect(() => {
    if (!componentSlug || !previewElementRef.current) {
      return;
    }

    const selector = componentSlug.toLowerCase();
    const root = previewElementRef.current.querySelector(selector);

    if (root) {
      if (cssAssetProxyUrls.length > 0) {
        const value = JSON.stringify(cssAssetProxyUrls);
        root.setAttribute('data-css-urls', value);
      } else {
        root.removeAttribute('data-css-urls');
      }
    }
  }, [componentSlug, cssAssetProxyUrls, snippet]);

  const assetSummary = useMemo(() => {
    const summary = componentAssets.reduce<Record<string, number>>(
      (acc, asset) => {
        const key = asset.type ?? 'other';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return summary;
  }, [componentAssets]);

  const handleReset = useCallback(() => {
    setFieldValues(initialValues);
  }, [initialValues]);

  const handleCopy = useCallback(async () => {
    if (!snippet) return;

    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy markup', error);
    }
  }, [snippet]);

  const renderField = useCallback(
    (field: DialogField, parentPath = ''): React.ReactNode => {
      if (!field) {
        return null;
      }

      if (field.type === 'tabs') {
        const tabs = field.children ?? [];
        const defaultTab = tabs[0]?.id ?? tabs[0]?.label ?? 'tab-0';

        return (
          <div className="flex flex-col gap-4">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList>
                {tabs.map((tab) => {
                  const tabValue = tab?.id ?? tab?.label ?? 'tab';
                  return (
                    <TabsTrigger key={tabValue} value={tabValue}>
                      {tab?.label ?? tab?.name ?? 'Tab'}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {tabs.map((tab) => {
                const tabValue = tab?.id ?? tab?.label ?? 'tab';
                return (
                  <TabsContent key={tabValue} value={tabValue} className="pt-4">
                    {renderField(tab as DialogField, parentPath)}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        );
      }

      const fieldName = typeof field.name === 'string' ? field.name : undefined;
      const fieldPath = fieldName
        ? joinPath(parentPath, fieldName)
        : parentPath;
      const fieldValue = getNestedValue(fieldValues, fieldPath);

      return (
        <FieldRenderer
          field={field}
          value={fieldValue}
          allValues={fieldValues}
          onChange={(nextValue: any) => {
            if (field.type === 'tab') {
              if (nextValue && typeof nextValue === 'object') {
                setFieldValues(nextValue);
              }
              return;
            }

            if (!fieldName) {
              if (nextValue && typeof nextValue === 'object') {
                setFieldValues(nextValue);
              }
              return;
            }

            setFieldValues((prev) =>
              setNestedValueImmutable(prev, fieldPath, nextValue),
            );
          }}
        />
      );
    },
    [fieldValues, setFieldValues],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-xl font-semibold">
              {component?.data?.title ??
                component?.data?.name ??
                'Component preview'}
            </CardTitle>
            <CardDescription>
              Interactively preview and configure this component version.
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">v{selectedVersion.version}</Badge>
              {Object.entries(assetSummary).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {getAssetTypeLabel(type as ComponentAsset['type'] | 'other')}{' '}
                  · {count}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RefreshCcw data-icon="inline-start" />
              Reset props
            </Button>
            <Button
              variant={showDebug ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowDebug((prev) => !prev)}
            >
              <Bug data-icon="inline-start" />
              {showDebug ? 'Hide debug' : 'Show debug'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/components/${component?.data?.id}/versions/${selectedVersion.id}/preview-new-window`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open in new window
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="bg-muted/40 p-6">
          {componentAssets
            .filter((asset) => asset.type === 'js' || asset.type === 'chunk')
            .map((asset) => (
              <Script
                key={asset.id}
                src={asset.url}
                type="module"
                strategy="afterInteractive"
              />
            ))}
          <div className="relative flex min-h-[320px] items-center justify-center rounded-lg border bg-background p-6">
            {!componentSlug ? (
              <span className="text-sm text-muted-foreground">
                Component slug not available. Unable to render preview.
              </span>
            ) : (
              <div
                ref={previewElementRef}
                key={selectedVersion.id}
                className="flex w-full justify-center"
                dangerouslySetInnerHTML={{
                  __html: snippet,
                }}
              />
            )}
          </div>
        </CardContent>
        {snippet && (
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <code className="block whitespace-pre-wrap break-words">
                  {snippet}
                </code>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Copy data-icon="inline-start" />
              {copied ? 'Copied!' : 'Copy markup'}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Component props</CardTitle>
          <CardDescription>
            Update values to see the component respond in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {dialogFields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-sm text-muted-foreground">
              This version does not expose any configurable props.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {dialogFields.map((field, index) => (
                <React.Fragment
                  key={field.id ?? field.name ?? `field-${index}`}
                >
                  {renderField(field)}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showDebug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dialog definition</CardTitle>
            <CardDescription>
              Raw configuration data used to build the prop controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[360px] w-full">
              <pre className="whitespace-pre-wrap break-words bg-muted/60 p-4 text-xs text-foreground">
                {JSON.stringify(selectedVersion.dialog ?? [], null, 2)}
              </pre>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreviewContainer;
