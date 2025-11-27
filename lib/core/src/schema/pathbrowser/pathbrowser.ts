import { BaseFieldInput, type BaseSchema } from '../../types';

export interface PathBrowserSchema<TOutput extends string | { path: string, [key: string]: string } = string | { path: string, [key: string]: string }> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'pathbrowser';
}

interface PathBrowserInput extends BaseFieldInput {
  placeholder: string;
  defaultValue?: string;
  folder?: boolean;
  path?: string;
  pageProperties?: string[];
}

export function pathbrowser(input: PathBrowserInput): PathBrowserSchema {
  const {placeholder, label, tooltip, required, defaultValue, folder = false, path, pageProperties} = input;

  return {
    type: 'pathbrowser',
    _parse() {
      return {
        type: 'pathbrowser',
        label,
        placeholder,
        tooltip,
        required,
        defaultValue,
        folder,
        pageProperties,
        path
      }
    },
    _primitive() {
      return 'json'
    },
    ...input,
  }
}