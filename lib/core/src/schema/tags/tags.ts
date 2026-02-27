import { BaseFieldInput, type BaseSchema } from '../../types';

type TagsOutputType<Multiple extends boolean> = Multiple extends true ? String[] : String;

export interface TagsSchema<Multiple extends boolean = false> extends BaseSchema<TagsOutputType<Multiple>> {
  /**
   * The schema type.
   */
  type: 'tags';
}

interface TagsInput extends BaseFieldInput {
  placeholder?: string;
  defaultValue?: string;
  multiple?: boolean;
  namespaces?: string[];
}

export function tags<Multiple extends boolean = false>(input: TagsInput & {
  multiple?: Multiple
}): TagsSchema<Multiple> {
  const { placeholder, label, required, defaultValue, multiple, namespaces } = input;

  return {
    type: 'tags',
    _parse() {
      return {
        type: 'tags',
        label,
        placeholder,
        required,
        defaultValue,
        multiple,
        namespaces,
      };
    },
    _primitive() {
      return multiple ? 'json' : 'string';
    },
    ...input,
  };
}
