import { BaseFieldInput, type BaseSchema } from '../../types';

export interface ImageSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'image';
}

interface ImageInput extends BaseFieldInput {
  defaultValue?: string;
}

export function image(input: ImageInput): ImageSchema {
  const {label, tooltip, required, defaultValue} = input;

  return {
    type: 'image',
    _parse() {
      return {
        type: 'image',
        label,
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