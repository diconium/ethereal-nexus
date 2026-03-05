import {FieldConfig} from './types';

const parseBound = (bound?: string): number | undefined => {
  if (bound === undefined) return undefined;
  const parsed = parseInt(bound, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(parsed, 0);
};

export const normalizeMultifieldValue = (value: unknown): any[] => {
  return Array.isArray(value) ? value : [];
};

export const getMultifieldItemsConstraintError = (field: FieldConfig, value: unknown): string | null => {
  const multifieldValue = normalizeMultifieldValue(value);
  const minItems = parseBound(field.min);
  const maxItems = parseBound(field.max);
  const fieldLabel = field.label || field.name || 'This field';

  if (minItems !== undefined && multifieldValue.length < minItems) {
    return `${fieldLabel} must have at least ${minItems} item(s)`;
  }

  if (maxItems !== undefined && multifieldValue.length > maxItems) {
    return `${fieldLabel} must have no more than ${maxItems} item(s)`;
  }

  return null;
};

