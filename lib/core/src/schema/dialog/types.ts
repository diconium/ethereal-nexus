import { ResolveObject } from '../../types/utils';
import type { BaseSchema, Output } from '../../types/schema';

/**
 * Dialog entries type.
 */
export interface DialogEntries {
  [key: string]: BaseSchema;
}

/**
 * Entries output inference type.
 */
type EntriesOutput<TEntries extends DialogEntries> = {
  [TKey in keyof TEntries]: Output<TEntries[TKey]>;
};
/**
 * Object output inference type.
 */
export type DialogOutput<TEntries extends DialogEntries> = ResolveObject<EntriesOutput<TEntries>>