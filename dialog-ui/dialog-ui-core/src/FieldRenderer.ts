import { FieldConfig } from './types';

export interface FieldRendererProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string | null;
  path?: string;
  page?: string;
}

export interface MultifieldRendererProps {
  field: FieldConfig;
  value: any[];
  onChange: (value: any[]) => void;
  error?: string | null;
  path: string;
  page?: string;
  itemLabelKey?: string;
}

// Core render logic - platform agnostic
export class FieldRenderLogic {
  static getFieldPath(path: string, fieldName: string): string {
    return path ? `${path}.${fieldName}` : fieldName;
  }

  static shouldShowTooltip(field: FieldConfig): boolean {
    return !!(field.tooltip &&
      field.type !== 'textfield' &&
      field.type !== 'select' &&
      field.type !== 'picker');
  }

  static createMultifieldItem(field: FieldConfig): any {
    return field.children?.reduce((acc, child) => {
      acc[child.name] = child.type === 'multifield' ? [] : '';
      return acc;
    }, {} as any) || {};
  }

  static addMultifieldItem(currentValue: any[], field: FieldConfig): any[] {
    const newItem = this.createMultifieldItem(field);
    return [...currentValue, newItem];
  }

  static removeMultifieldItem(currentValue: any[], index: number): any[] {
    const newValue = [...currentValue];
    newValue.splice(index, 1);
    return newValue;
  }

  static updateMultifieldItem(
    currentValue: any[],
    index: number,
    childName: string,
    childValue: any
  ): any[] {
    const newValue = [...currentValue];
    if (!newValue[index]) {
      newValue[index] = {};
    }
    newValue[index][childName] = childValue;
    return newValue;
  }
}

// Abstract renderer interface that UI libraries should implement
export interface IFieldRenderer<TComponent = any> {
  renderTextField(props: FieldRendererProps): TComponent;
  renderSelect(props: FieldRendererProps): TComponent;
  renderCheckbox(props: FieldRendererProps): TComponent;
  renderSwitch(props: FieldRendererProps): TComponent;
  renderMultifield(props: MultifieldRendererProps): TComponent;
  renderUnsupportedField(fieldType: string): TComponent;
}

export abstract class BaseFieldRenderer<TComponent = any> implements IFieldRenderer<TComponent> {
  abstract renderTextField(props: FieldRendererProps): TComponent;
  abstract renderSelect(props: FieldRendererProps): TComponent;
  abstract renderCheckbox(props: FieldRendererProps): TComponent;
  abstract renderSwitch(props: FieldRendererProps): TComponent;
  abstract renderMultifield(props: MultifieldRendererProps): TComponent;
  abstract renderUnsupportedField(fieldType: string): TComponent;

  render(props: FieldRendererProps): TComponent {
    const { field } = props;

    switch (field.type) {
      case 'textfield':
        return this.renderTextField(props);
      case 'select':
      case 'picker':
        return this.renderSelect(props);
      case 'checkbox':
        return this.renderCheckbox(props);
      case 'switch':
        return this.renderSwitch(props);
      case 'multifield':
        return this.renderMultifield({
          ...props,
          value: props.value || [],
          path: FieldRenderLogic.getFieldPath(props.path || '', field.name)
        });
      default:
        return this.renderUnsupportedField(field.type);
    }
  }
}
