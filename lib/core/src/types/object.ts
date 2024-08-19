import { OptionalSchema } from '../schema/optional';
import { BaseSchema, Output } from './schema';
import { ResolveObject } from './utils';
import { DynamicZoneSchema } from '../schema/dynamic';


/**
 * Required object keys type.
 */
type RequiredKeys<
  TEntries extends ObjectEntries,
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
  TEntries extends ObjectEntries,
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
  TEntries extends ObjectEntries,
  TObject extends EntriesOutput<TEntries>,
> = Pick<TObject, RequiredKeys<TEntries, TObject>> &
  Partial<Pick<TObject, OptionalKeys<TEntries, TObject>>>;

/**
 * Object entries type.
 */
export interface ObjectEntries {
  [key: string]: BaseSchema;
}

/**
 * Object entries type.
 */
export interface SlotEntries {
  [key: string]: BaseSchema;
}

/**
 * Entries output inference type.
 */
type EntriesOutput<TEntries extends ObjectEntries> = {
  [TKey in keyof TEntries]: Output<TEntries[TKey]>;
};

/**
 * Object output inference type.
 */
export type ObjectOutput<TEntries extends ObjectEntries> = ResolveObject<WithQuestionMarks<TEntries, EntriesOutput<TEntries>>>
