import { BaseFieldInput, type BaseSchema } from '../../types';

export interface RichTextEditorSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'richtexteditor';
}

type FeatureOptionsType = "sourceedit"


interface RichTextEditorInput extends BaseFieldInput {
  placeholder?: string;
  defaultValue?: string;
  features?: FeatureOptionsType[];
}

export function rte(input: RichTextEditorInput): RichTextEditorSchema {
  const {placeholder, label, tooltip, required, defaultValue, features} = input;

  return {
    type: 'richtexteditor',
    _parse() {
      return {
        type: 'richtexteditor',
        label,
        placeholder,
        tooltip,
        required,
        defaultValue,
        features
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}