import { BaseFieldInput, type BaseSchema } from '../../types';

export interface PathBrowserSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'pathbrowser';
}

interface PathBrowserInput extends BaseFieldInput {
  placeholder: string;
}

export function pathbrowser(input: PathBrowserInput): PathBrowserSchema {
  const {placeholder, label} = input;

  return {
    type: 'pathbrowser',
    _parse() {
      return {
        type: 'pathbrowser',
        label,
        placeholder,
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}