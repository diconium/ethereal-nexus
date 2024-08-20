import { BaseFieldInput, type BaseSchema } from '../../types';

type SelectOutputType<Multiple extends boolean> = Multiple extends true ? string[] : string;

export interface SelectSchema<Multiple extends boolean = false> extends BaseSchema<SelectOutputType<Multiple>> {
  /**
   * The schema type.
   */
  type: 'select';
}

interface SelectInput extends BaseFieldInput {
  placeholder?: string;
  multiple?: boolean ;
  values: {
    value: string,
    label: string,
  }[]
}

export function select<Multiple extends boolean = false>(input: SelectInput & { multiple?: Multiple }): SelectSchema<Multiple> {
  const { label, values, tooltip, placeholder, multiple = false as Multiple, required } = input;

  return {
    type: 'select',
    _parse() {
      return {
        type: 'select',
        label,
        multiple,
        values,
        tooltip,
        placeholder,
        required
      }
    },
    _primitive() {
      return multiple ? 'json' : 'string';
    },
    ...input,
  }
}
