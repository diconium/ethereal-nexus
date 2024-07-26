import { BaseFieldInput, type BaseSchema } from '../../types';

export interface TextSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'textfield';
}

interface TextInput extends BaseFieldInput {
  placeholder: string;
}

export function text(input: TextInput): TextSchema {
  const {placeholder, label,tooltip} = input;

  return {
    type: 'textfield',
    _parse() {
      return {
        type: 'textfield',
        label,
        placeholder,
        tooltip,
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}