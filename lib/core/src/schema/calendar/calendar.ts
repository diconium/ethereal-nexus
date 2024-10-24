import { BaseFieldInput, type BaseSchema } from '../../types';

export interface CalendarSchema<TOutput extends string = string> extends BaseSchema<TOutput> {
  /**
   * The schema type.
   */
  type: 'calendar';
}

interface CalendarInput extends BaseFieldInput {
  placeholder?: string;
  valueformat: string;
  displayformat: string;
  headerformat: string;
  startday?: string;
  min?: string;
  max?: string;
  defaultValue?: string;
}

export function calendar(input: CalendarInput): CalendarSchema {
  const {valueformat,startday=0,min,max, placeholder, label,tooltip,required, defaultValue} = input;

  return {
    type: 'calendar',
    _parse() {
      return {
        type: 'calendar',
        label,
        valueformat,
        placeholder,
        startday,
        tooltip,
        min,
        max,
        required,
        defaultValue
      }
    },
    _primitive() {
      return 'string'
    },
    ...input,
  }
}