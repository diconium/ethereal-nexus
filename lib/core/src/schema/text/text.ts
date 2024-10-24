import { BaseFieldInput, type BaseSchema } from '../../types';

export interface TextSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'textfield';
}

interface TextInput extends BaseFieldInput {
  placeholder?: string;
  defaultValue?: string;
}

export function text(input: TextInput): TextSchema {
  const {placeholder, label,tooltip, required, defaultValue} = input;

  return {
    type: 'textfield',
    _parse() {
      return {
        type: 'textfield',
        label,
        placeholder,
        tooltip,
        required,
        defaultValue
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}