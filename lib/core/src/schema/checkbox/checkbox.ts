import { BaseFieldInput, type BaseSchema } from '../../types';

export interface CheckBoxSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'checkbox';
}

interface CheckBoxInput extends BaseFieldInput {
  showastoggle?: boolean
  defaultValue?: boolean | string;
}

export function checkbox(input: CheckBoxInput): CheckBoxSchema {
  const {label, tooltip, showastoggle = false, defaultValue} = input;

  return {
    type: 'checkbox',
    _parse() {
      return {
        type: 'checkbox',
        label,
        tooltip,
        showastoggle,
        defaultValue
      }
    },
    _primitive() {
      return 'boolean'
    },
    ...input,
  }
}
