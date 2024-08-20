import { BaseFieldInput, type BaseSchema } from '../../types';

export interface DataModelSchema<TOutput extends Record<string, any> = Record<string, any>> extends BaseSchema<TOutput> {  /**
   * The schema type.
   */
  type: 'datamodel';
}

interface DataModelInput extends BaseFieldInput {
  placeholder?: string;
}

export function datamodel(input: DataModelInput): DataModelSchema {
  const {placeholder, label,tooltip, required} = input;

  return {
    type: 'datamodel',
    _parse() {
      return {
        type: 'datamodel',
        label,
        placeholder,
        tooltip,
        required
      }
    },
    _primitive() {
      return 'json'
    },
    ...input,
  }
}