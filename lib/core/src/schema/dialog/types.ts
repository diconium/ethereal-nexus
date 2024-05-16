import { ResolveObject } from '../../types';
import type { BaseSchema, Output } from '../../types';
import { OptionalSchema } from '../optional';

/**
 * Required object keys type.
 */
type RequiredKeys<
  TEntries extends DialogEntries,
  TObject extends EntriesOutput<TEntries>,
> = {
  [TKey in keyof TEntries]: TEntries[TKey] extends OptionalSchema<any, any>
    ? undefined extends TObject[TKey]
      ? never
      : TKey
    : TKey;
}[keyof TEntries];

/**
 * Optional object keys type.
 */
type OptionalKeys<
  TEntries extends DialogEntries,
  TObject extends EntriesOutput<TEntries>,
> = {
  [TKey in keyof TEntries]: TEntries[TKey] extends OptionalSchema<any, any>
    ? undefined extends TObject[TKey]
      ? TKey
      : never
    : never;
}[keyof TEntries];

/**
 * Object with question marks type.
 */
type WithQuestionMarks<
  TEntries extends DialogEntries,
  TObject extends EntriesOutput<TEntries>,
> = Pick<TObject, RequiredKeys<TEntries, TObject>> &
  Partial<Pick<TObject, OptionalKeys<TEntries, TObject>>>;

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
export type DialogOutput<TEntries extends DialogEntries> = ResolveObject<WithQuestionMarks<TEntries, EntriesOutput<TEntries>>>
