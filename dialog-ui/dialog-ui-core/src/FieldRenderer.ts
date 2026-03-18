import { FieldConfig } from './types';
import { normalizeMultifieldValue } from './multifieldValidation';

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

  static getFieldKey(field: FieldConfig): string {
    return field.name || field.id;
  }

  static shouldShowTooltip(field: FieldConfig): boolean {
    return !!(
      field.tooltip &&
      field.type !== 'textfield' &&
      field.type !== 'select' &&
      field.type !== 'picker'
    );
  }

  static createMultifieldItem(field: FieldConfig): any {
    const item =
      field.children?.reduce((acc, child) => {
        acc[this.getFieldKey(child)] =
          child.type === 'multifield' ? [] : undefined;
        return acc;
      }, {} as any) || {};

    item.__itemKey = this.generateMultifieldItemKey(field);
    return item;
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
    childValue: any,
  ): any[] {
    const newValue = [...currentValue];
    if (!newValue[index]) {
      newValue[index] = {};
    }
    newValue[index][childName] = childValue;
    return newValue;
  }

  static updateMultifieldItemWithField(
    currentValue: any[],
    index: number,
    childField: FieldConfig,
    childValue: any,
  ): any[] {
    const key = this.getMultifieldChildStorageKey(childField);
    const value =
      childField.type === 'datamodel'
        ? this.normalizeDatamodelValue(childValue)
        : childValue;

    return this.updateMultifieldItem(currentValue, index, key, value);
  }

  static normalizeMultifieldItems(value: unknown): any[] {
    return normalizeMultifieldValue(value);
  }

  static getMultifieldChildStorageKey(childField: FieldConfig): string {
    const key = this.getFieldKey(childField);
    return childField.type === 'datamodel' ? `cf_${key}` : key;
  }

  static getMultifieldChildValue(item: any, childField: FieldConfig): any {
    if (!item || typeof item !== 'object') {
      return undefined;
    }

    const key = this.getMultifieldChildStorageKey(childField);
    return item[key];
  }

  static getMultifieldItemLabel(
    field: FieldConfig,
    item: any,
    index: number,
  ): string {
    if (!item || typeof item !== 'object') {
      return `Item ${index + 1}`;
    }

    if (
      field.itemLabelKey &&
      typeof item[field.itemLabelKey] === 'string' &&
      item[field.itemLabelKey].trim() !== ''
    ) {
      return item[field.itemLabelKey].trim();
    }

    if (Array.isArray(field.children)) {
      for (const child of field.children) {
        const childKey = this.getFieldKey(child);
        const childValue = item[childKey];
        if (typeof childValue === 'string' && childValue.trim() !== '') {
          return childValue.trim();
        }
      }
    }

    if (typeof item.__itemKey === 'string') {
      return item.__itemKey;
    }

    return `Item ${index + 1}`;
  }

  static reorderMultifieldItems(
    currentValue: any[],
    fromIndex: number,
    toIndex: number,
  ): any[] {
    if (fromIndex === toIndex) {
      return currentValue;
    }

    const value = [...currentValue];
    if (
      fromIndex < 0 ||
      fromIndex >= value.length ||
      toIndex < 0 ||
      toIndex >= value.length
    ) {
      return value;
    }

    const [moved] = value.splice(fromIndex, 1);
    value.splice(toIndex, 0, moved);
    return value;
  }

  static generateMultifieldItemKey(field: FieldConfig): string {
    const prefix = this.getFieldKey(field) || 'item';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  static ensureMultifieldItemKey(
    item: any,
    field: FieldConfig,
    index: number,
  ): string {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.__itemKey === 'string' &&
      item.__itemKey.trim() !== ''
    ) {
      return item.__itemKey;
    }

    return `${this.getFieldKey(field)}-${index}`;
  }

  static normalizeDatamodelValue(value: any): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const first = Object.values(value)[0];
    if (first && typeof first === 'object') {
      return first;
    }

    return value;
  }
}

// Abstract renderer interface that UI libraries should implement
export interface IFieldRenderer<TComponent = any> {
  renderTextField(props: FieldRendererProps): TComponent;
  renderSelect(props: FieldRendererProps): TComponent;
  renderCheckbox(props: FieldRendererProps): TComponent;
  renderSwitch(props: FieldRendererProps): TComponent;
  renderTags(props: FieldRendererProps): TComponent;
  renderMultifield(props: MultifieldRendererProps): TComponent;
  renderUnsupportedField(fieldType: string): TComponent;
}

export abstract class BaseFieldRenderer<
  TComponent = any,
> implements IFieldRenderer<TComponent> {
  abstract renderTextField(props: FieldRendererProps): TComponent;
  abstract renderSelect(props: FieldRendererProps): TComponent;
  abstract renderCheckbox(props: FieldRendererProps): TComponent;
  abstract renderSwitch(props: FieldRendererProps): TComponent;
  abstract renderTags(props: FieldRendererProps): TComponent;
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
      case 'tags':
        return this.renderTags(props);
      case 'multifield':
        return this.renderMultifield({
          ...props,
          value: FieldRenderLogic.normalizeMultifieldItems(props.value),
          path: FieldRenderLogic.getFieldPath(props.path || '', field.name),
          itemLabelKey: field.itemLabelKey,
        });
      default:
        return this.renderUnsupportedField(field.type);
    }
  }
}
