import { BaseFieldInput, type BaseSchema } from '../../types';

export interface ImageSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'image';
}

interface ImageInput extends BaseFieldInput {
  placeholder: string;
}

export function image(input: ImageInput): ImageSchema {
  const {placeholder, label, tooltip} = input;

  return {
    type: 'image',
    _parse() {
      return {
        type: 'image',
        label,
        placeholder,
        tooltip
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}