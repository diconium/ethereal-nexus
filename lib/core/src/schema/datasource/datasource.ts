import { BaseFieldInput, type BaseSchema } from '../../types';

export interface DataSourceSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'datasource';
}

interface DataSourceBody {
  [key: string]: any;
}
interface DataSourceInput extends BaseFieldInput {
  placeholder: string;
  url: string;
  multiple: boolean;
  body: DataSourceBody;
}

export function datasource(input: DataSourceInput): DataSourceSchema {
  const {label, body, url, tooltip,placeholder,multiple, required} = input;

  return {
    type: 'datasource',
    _parse() {
      return {
        type: 'datasource',
        label,
        url,
        multiple,
        body,
        tooltip,
        placeholder,
        required,
      }
    },
    _primitive() {
      return multiple ? 'json' : 'string';
    },
    ...input,
  }
}
