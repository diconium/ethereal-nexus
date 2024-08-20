import { BaseFieldInput, type BaseSchema } from '../../types';
import { SelectSchema } from '../select';
type DataSourceOutputType<Multiple extends boolean> = Multiple extends true ? string[] : string;

export interface DataSourceSchema<Multiple extends boolean = false> extends BaseSchema<DataSourceOutputType<Multiple>> {
  /**
   * The schema type.
   */
  type: 'datasource';
}

interface DataSourceBody {
  [key: string]: any;
}
interface DataSourceInput extends BaseFieldInput {
  placeholder?: string;
  url: string;
  multiple?: boolean;
  body: DataSourceBody;
}

export function datasource<Multiple extends boolean = false>(input: DataSourceInput & { multiple?: Multiple }): DataSourceSchema<Multiple> {
  const {label, body, url, tooltip,placeholder, multiple = false as Multiple, required } = input;

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
