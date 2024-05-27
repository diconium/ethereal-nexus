import { BaseSchema } from './schema';

/**
 * Infer output type.
 */
export type InferOutput<
  TSchema extends
      | BaseSchema<unknown>
> = NonNullable<TSchema['_types']>['output'];
