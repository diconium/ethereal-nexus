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
export type EntryMask<T> = RequireAtLeastOne<{ [key in keyof T]?: true }>;

/**
 * Create a type that makes all properties of an object and its nested objects optional.
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Add a union type to all properties of an object and its nested objects.
 */
export type AddType<T, TUnion> = T extends object
  ? { [K in keyof T]: AddType<T[K], TUnion> | TUnion }
  : TUnion;

/**
 * Remove all array types, leaving the underlying type, including from nested objects.
 */
export type UnArray<T> = T extends Array<infer U>
  ? UnArray<U>
  : T extends object
    ? { [K in keyof T]: UnArray<T[K]> }
    : T;

/**
 * Create a type that represents all possible key paths in an object.
 *
 * The keys are represented as strings, and nested paths are joined by dots.
 */
export type LeavesPath<T> = T extends object ? {
  [K in keyof T]:
  `${Exclude<K, symbol>}${LeavesPath<T[K]> extends never ? '' : `.${LeavesPath<T[K]>}`}`
}[keyof T] : never

/**
 * Create a type that represents all possible key paths in an object.
 *
 * The keys are represented as strings, and nested paths are joined by dots.
 * This includes both leaves and intermediate branches.
 */
export type NodesPath<T> = T extends object ? {
  [K in keyof T]:
  | `${Exclude<K, symbol>}`  // Include the current key (branch)
  | `${Exclude<K, symbol>}${LeavesPath<T[K]> extends never ? '' : `.${NodesPath<T[K]>}`}`  // Recurse into nested objects
}[keyof T] : never

/**
 * Get the type of the value at a given path in an object.
 *
 * The path is a string where nested properties are separated by dots.
 */
export type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}` // Split the path into current key `K` and remaining path `Rest`
    ? K extends keyof T // Check if `K` is a valid key of `T`
      ? PathValue<T[K], Rest> // Recur for the remaining path `Rest`
      : never // Invalid key, return never
    : P extends keyof T // If there is no dot, check if `P` is a key of `T`
      ? T[P] // Return the type for the key
      : never;


/**
 * Create a type that represents all possible nested key paths in an object.
 *
 * The keys are represented as strings, and nested paths are joined by dots.
 * Each path includes the current key and the keys of any nested objects.
 */
export type NestedPaths<T> = T extends object ?
  { [K in keyof T & string]: K | `${K}.${NestedPaths<T[K]>}` }[keyof T & string] :
  never;