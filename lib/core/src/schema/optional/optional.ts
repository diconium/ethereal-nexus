import { BaseSchema, Output } from '../../types';

/**
 * Optional schema type.
 */
export interface OptionalSchema<
  TWrapped extends BaseSchema,
  TOutput = Output<TWrapped> | undefined
> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'optional';
  /**
   * The wrapped schema.
   */
  wrapped: TWrapped;
}


/**
 * Creates an optional schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns A optional schema.
 */
export function optional<TWrapped extends BaseSchema>(
  wrapped: TWrapped
): OptionalSchema<TWrapped> {
  return {
    type: 'optional',
    wrapped,
    _primitive() {
      return this.wrapped._primitive();
    },
    _parse() {
      return this.wrapped._parse();
    },
  };
}