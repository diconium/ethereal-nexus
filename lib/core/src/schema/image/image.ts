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
  const {placeholder, label, tooltip, required} = input;

  return {
    type: 'image',
    _parse() {
      return {
        type: 'image',
        label,
        placeholder,
        tooltip,
        required
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}