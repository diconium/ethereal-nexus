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
  validationRegex?: string;
  validationErrorMessage?: string;

}

export function text(input: TextInput): TextSchema {
  const {placeholder, label,tooltip, required, defaultValue, validationRegex, validationErrorMessage} = input;

  return {
    type: 'textfield',
    _parse() {
      return {
        type: 'textfield',
        label,
        placeholder,
        tooltip,
        required,
        defaultValue,
        validationRegex,
        validationErrorMessage
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}
