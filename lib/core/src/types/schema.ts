import { WebcomponentPropTypes } from './webcomponent';

import { Conditions } from '../schema/dialog/types';

/**
 * Base schema type.
 */
export interface BaseSchema<TOutput = any> {
  /**
   * The schema type.
   */
  type: string;

  /**
   * The schema type.
   */
  condition?: Conditions[];

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
  _types?: {
    output: TOutput,
  };
}

/**
 * Base input for field types.
 */
export interface BaseFieldInput {
  /**
   * The field label.
   */
  label: string;
  tooltip?: string;
  required?: boolean;
}

/**
 * Output inference type.
 */
export type Output<TSchema extends BaseSchema> = NonNullable<
  TSchema['_types']
>['output'];