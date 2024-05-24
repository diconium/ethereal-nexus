import { BaseFieldInput, type BaseSchema } from '../../types';

export interface SelectSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'select';
}

interface SelectInput extends BaseFieldInput {
  values: {
    value: string,
    label: string,
  }[]
}

export function select(input: SelectInput): SelectSchema {
  const {label, values} = input;

  return {
    type: 'select',
    _parse() {
      return {
        type: 'select',
        label,
        values,
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}
