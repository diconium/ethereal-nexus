import { BaseFieldInput, type BaseSchema } from '../../types';

type MediaOutputType = {
  alt: string;
  url: string;
  renditions: string[];
};

export interface MediaSchema<TOutput extends string = string> extends BaseSchema<MediaOutputType> {
  /**
   * The schema type.
   */
  type: 'media';
}

type ImageTypes = 'image/gif' | 'image/jpeg' | 'image/png' | 'image/tiff' | 'image/svg+xml';
type VideoTypes = 'video/mp4' | 'video/webm' | 'video/ogg';
type PDFTypes = 'application/pdf';
type ZipTypes = 'application/zip' | 'application/x-zip-compressed' | 'application/x-zip' | 'application/x-compressed' | 'multipart/x-zip';


interface MediaInput extends BaseFieldInput {
  defaultValue?: string;
  allowedMimeTypes?: ( PDFTypes | ZipTypes | ImageTypes | VideoTypes )[];
}

export function media(input: MediaInput): MediaSchema {
  const { label, tooltip, required, defaultValue, allowedMimeTypes } = input;

  return {
    type: 'media',
    _parse() {
      return {
        type: 'media',
        label,
        tooltip,
        required,
        defaultValue,
        allowedMimeTypes
      };
    },
    _primitive() {
      return 'json';
    },
    ...input,
  };
}

/**
 * @deprecated Use `media` instead.
 */
export const image = (input: MediaInput = {
  label: 'image',
  allowedMimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/tiff', 'image/svg+xml'],
}) => media(input);
