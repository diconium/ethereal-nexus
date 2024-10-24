import { BaseFieldInput, BaseSchema } from '../../types';

type ReadonlyObject<T> = {
  readonly [K in keyof T]: T[K];
};

export interface SelectSchema<T, TMultiple extends boolean = false> extends BaseSchema<TMultiple extends true ? T[] : T> {
  /**
   * The schema type.
   */
  type: 'select';
  multiple: TMultiple;
}

interface SelectInput<TMultiple extends boolean = false> extends BaseFieldInput {
  placeholder?: string;
  multiple?: TMultiple;
  values: {
    value: string;
    label: string;
  }[];
  defaultValue?: TMultiple extends true ? string[] : string;
}

type ValuesType<T extends { values: readonly { value: string }[] }> = T['values'][number]['value'];

export function select<const T extends SelectInput<TMultiple>, TMultiple extends boolean = T['multiple'] extends true ? true : false>(input: T): SelectSchema<ValuesType<ReadonlyObject<T>>, TMultiple> {
  const { label, values, tooltip, placeholder, multiple = false, required, defaultValue } = input;

  if (!multiple && Array.isArray(defaultValue)) {
    throw new Error('defaultValue should be a string when multiple is false');
  }

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
        required,
        defaultValue
      };
    },
    _primitive() {
      return multiple ? 'json' : 'string';
    },
    ...input,
    multiple: multiple as TMultiple,
  };
}