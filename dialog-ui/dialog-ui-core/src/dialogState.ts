import type { DialogField, FieldConfig } from './types';

export type FieldValueMap = Record<string, any>;

type DialogLikeField = DialogField | FieldConfig;

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isObjectLike(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function normalizePath(path: string) {
  return path.replace(/\[(\d+)\]/g, '.$1');
}

function getPathSegments(path: string): string[] {
  return normalizePath(path)
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isUnsafePathSegment(segment: string) {
  return UNSAFE_PATH_SEGMENTS.has(segment);
}

function joinPath(parent: string, current?: string | null) {
  if (!current) {
    return parent;
  }

  return parent ? `${parent}.${current}` : current;
}

export function getNestedValue(source: FieldValueMap, path: string) {
  if (!path) {
    return source;
  }

  return getPathSegments(path).reduce<any>((current, key) => {
    if (!isObjectLike(current) && !Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, any>)[key];
  }, source);
}

export function setNestedValueMutable(
  target: FieldValueMap,
  path: string,
  value: any,
) {
  const keys = getPathSegments(path);
  if (keys.length === 0 || keys.some(isUnsafePathSegment)) {
    return;
  }

  let current: FieldValueMap = target;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    if (!isObjectLike(current[key])) {
      current[key] = {};
    }

    current = current[key];
  });
}

export function setNestedValueImmutable(
  source: FieldValueMap,
  path: string,
  value: any,
): FieldValueMap {
  if (!path) {
    return isObjectLike(value) ? value : source;
  }

  const keys = getPathSegments(path);
  if (keys.length === 0 || keys.some(isUnsafePathSegment)) {
    return source;
  }

  const update = (
    currentSource: FieldValueMap,
    remainingKeys: string[],
  ): FieldValueMap => {
    const [currentKey, ...restKeys] = remainingKeys;
    if (!currentKey) {
      return currentSource;
    }

    if (restKeys.length === 0) {
      return {
        ...currentSource,
        [currentKey]: value,
      };
    }

    const nextSource = isObjectLike(currentSource?.[currentKey])
      ? currentSource[currentKey]
      : {};

    return {
      ...currentSource,
      [currentKey]: update(nextSource, restKeys),
    };
  };

  return update(source, keys);
}

export function flattenFieldValues(
  values: FieldValueMap,
  prefix = '',
): Array<[string, any]> {
  const entries: Array<[string, any]> = [];

  Object.entries(values ?? {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isObjectLike(value) && !Array.isArray(value)) {
      entries.push(...flattenFieldValues(value, path));
      return;
    }

    entries.push([path, value]);
  });

  return entries;
}

export function extractDefaultValue(field: DialogLikeField): any {
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

export function buildInitialValues(
  fields: DialogLikeField[] | undefined,
): FieldValueMap {
  const defaults: FieldValueMap = {};

  const assignDefaults = (
    nestedFields?: DialogLikeField[] | null,
    parentPath = '',
  ) => {
    if (!nestedFields) {
      return;
    }

    nestedFields.forEach((field) => {
      if (!field) {
        return;
      }

      const fieldName = typeof field.name === 'string' ? field.name : undefined;

      if (field.type === 'tabs' || field.type === 'tab') {
        assignDefaults(field.children, parentPath);
        return;
      }

      if (field.type === 'group' || field.type === 'fieldset') {
        const groupPath = fieldName
          ? joinPath(parentPath, fieldName)
          : parentPath;
        assignDefaults(field.children, groupPath);
        return;
      }

      if (!fieldName) {
        assignDefaults(field.children, parentPath);
        return;
      }

      const fieldPath = joinPath(parentPath, fieldName);
      setNestedValueMutable(defaults, fieldPath, extractDefaultValue(field));
    });
  };

  assignDefaults(fields);
  return defaults;
}
