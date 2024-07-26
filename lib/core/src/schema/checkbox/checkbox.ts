import { BaseFieldInput, type BaseSchema } from '../../types';

export interface CheckBoxSchema<TOutput extends boolean = boolean> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'checkbox';
}

interface CheckBoxInput extends BaseFieldInput {}

export function checkbox(input: CheckBoxInput): CheckBoxSchema {
  const {label, tooltip} = input;

  return {
    type: 'checkbox',
    _parse() {
      return {
        type: 'checkbox',
        label,
        tooltip,
      }
    },
    _primitive() {
      return 'boolean'
    },
    ...input,
  }
}