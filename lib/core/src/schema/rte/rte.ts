import { BaseFieldInput, type BaseSchema } from '../../types';

export interface RichTextEditorSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'richtexteditor';
}

interface RichTextEditorInput extends BaseFieldInput {
  placeholder: string;
}

export function rte(input: RichTextEditorInput): RichTextEditorSchema {
  const {placeholder, label, tooltip} = input;

  return {
    type: 'richtexteditor',
    _parse() {
      return {
        type: 'richtexteditor',
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