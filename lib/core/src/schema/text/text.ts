import { BaseFieldInput, type BaseSchema } from '../../types/schema';

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
  return {
    type: 'textfield',
    ...input,
  }
}