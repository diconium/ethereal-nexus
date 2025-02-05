import { BaseFieldInput, type BaseSchema } from '../../types';

export interface NavigationSchema extends BaseSchema<NavigationItemSchema[]> {  /**
   * The schema type.
   */
  type: 'navigation';
}

export interface NavigationItemSchema {
  id: string;
  children: NavigationItemSchema[];
  active: boolean;
  url: string;
  title: string;
}


interface DataModelInput extends BaseFieldInput {
  placeholder?: string;
  showChildrenCheckbox?: boolean;
  showRootLevel?: boolean;
  defaultValue?: string;
  pageProperties?:{
    value: string;
    label: string;
  }[]
}

export function navigation(input: DataModelInput): NavigationSchema {
  const {placeholder, label,tooltip, required, showChildrenCheckbox, showRootLevel, defaultValue, pageProperties} = input;

  return {
    type: 'navigation',
    _parse() {
      return {
        type: 'navigation',
        label,
        placeholder,
        tooltip,
        required,
        showChildrenCheckbox,
        showRootLevel,
        defaultValue,
        pageProperties,
      }
    },
    _primitive() {
      return 'json'
    },
    ...input,
  }
}