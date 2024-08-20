import { BaseFieldInput, type BaseSchema } from '../../types';

export interface ImageSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'image';
}

interface ImageInput extends BaseFieldInput {
}

export function image(input: ImageInput): ImageSchema {
  const {label, tooltip, required} = input;

  return {
    type: 'image',
    _parse() {
      return {
        type: 'image',
        label,
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