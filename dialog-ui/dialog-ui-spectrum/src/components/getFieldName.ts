import {FieldConfig} from "@ethereal-nexus/dialog-ui-core";

export const getFieldName = (field: FieldConfig): string => {
  const fieldId = field.id || field.name;
  if (field.type === 'navigation') {
    return `nav_${fieldId}`;
  }
  return fieldId;
}