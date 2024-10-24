import { BaseFieldInput, type BaseSchema } from '../../types';

export interface RichTextEditorSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'richtexteditor';
}

interface RichTextEditorInput extends BaseFieldInput {
  placeholder?: string;
  defaultValue?: string;
}

export function rte(input: RichTextEditorInput): RichTextEditorSchema {
  const {placeholder, label, tooltip, required, defaultValue} = input;

  return {
    type: 'richtexteditor',
    _parse() {
      return {
        type: 'richtexteditor',
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