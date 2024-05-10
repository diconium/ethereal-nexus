import { DialogSchema } from '../schema/dialog';
import { WebcomponentPropTypes } from './webcomponent';

/**
 * Base schema type.
 */
export interface BaseSchema<TOutput = any> {
  /**
   * The schema type.
   */
  type: string;

  /**
   * Internal function to transform the schema into JS object.
   */
  _parse(): object;

  /**
   * Internal function to transform the schema into JS object for webcomponent consumption.
   */
  _primitive(): WebcomponentPropTypes | Record<string, WebcomponentPropTypes>;

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