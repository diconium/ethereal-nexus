import { BaseFieldInput, type BaseSchema } from '../../types/schema';

export interface TextSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'textfield';
}

interface TextInput extends BaseFieldInput {
  placeholder: string;
  label: string;
}

export function text(input: TextInput): TextSchema {
  const {placeholder, label} = input;

  return {
    type: 'textfield',
    _parse() {
      return {
        type: 'textfield',
        label,
        placeholder,
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}