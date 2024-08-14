import { BaseFieldInput, type BaseSchema } from '../../types';

export interface SelectSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'select';
}

interface SelectInput extends BaseFieldInput {
  placeholder: string;
  multiple?: boolean ;
  values: {
    value: string,
    label: string,
  }[]
}

export function select(input: SelectInput): SelectSchema {
  const {label, values, tooltip,placeholder,multiple = false, required} = input;

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
