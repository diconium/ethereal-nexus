/**
 * Resolve type.
 *
 * Hint: This type has no effect and is only used so that TypeScript displays
 * the final type in the preview instead of the utility types used.
 */
type Resolve<T> = T;

/**
 * Resolve object type.
 *
 * Hint: This type has no effect and is only used so that TypeScript displays
 * the final type in the preview instead of the utility types used.
 */
export type ResolveObject<T> = Resolve<{ [k in keyof T]: T[k] }>;

/**
 * Create a type that requires at least one of the keys in the object.
 */
export type RequireAtLeastOne<TObject> = {
  [Key in keyof TObject]: Required<Pick<TObject, Key>> &
  Partial<Object>;
}[keyof TObject]

/**
 * Make a mask for an object.
 *
 * Receives an object and make a object with the keys, but only a boolean value
 */
export type EntryMask<T> = RequireAtLeastOne<{ [key in keyof T]?: boolean }>;

