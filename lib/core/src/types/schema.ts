import { DialogSchema } from '../schema/dialog';

/**
 * Base schema type.
 */
export interface BaseSchema<TOutput = any> {
  /**
   * The schema type.
   */
  type: string;

  /**
   * Input and output type.
   *
   * @internal
   */
  _types?: TOutput;
}

/**
 * Base input for field types.
 */
export interface BaseFieldInput {
  /**
   * The field label.
   */
  label: string;
}

/**
 * Output inference type.
 */
export type Output<TSchema extends BaseSchema> = NonNullable<
  TSchema['_types']
>;