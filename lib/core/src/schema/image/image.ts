import { BaseFieldInput, type BaseSchema } from '../../types';

type ImageOutputType = {
  alt: string;
  url: string;
  renditions: string[];
};

export interface ImageSchema<TOutput extends string = string> extends BaseSchema<ImageOutputType> {
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
      return 'json'
    },
    ...input,
  }
}