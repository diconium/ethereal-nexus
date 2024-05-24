import { type BaseSchema } from '../../types';
import { type WebcomponentPropTypes } from '../../types/webcomponent';

export interface HiddenSchema extends BaseSchema<string> {
  /**
   * The schema type.
   */
  type: 'hidden';
}

interface HiddenInput {
  type: WebcomponentPropTypes
}

/**
 * Creates a hidden schema.
 *
 * @param input The type of input for the webcomponent binding.
 *
 * @returns A hidden schema.
 */
export function hidden(input: HiddenInput): HiddenSchema {
  const {type} = input;

  return {
    type: 'hidden',
    _parse() {
      //Explicitly hidding this input from the parse final result.
      return this;
    },
    _primitive() {
      return type
    },
  }
}