import {FieldConfig} from "@ethereal-nexus/dialog-ui-core";

const getValueByPath = (obj: any, path: any) => {

  if (!path) return undefined;

  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');

  return keys.reduce((acc:any, key: string) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

const calculateEffectivePath = (condition?: any, effectivePath?: string) => {

  if (!condition?.field) {
    return effectivePath;
  }

  const parts = condition.field.split('.');

  for (let i = 0; i < parts.length; i++) {
    if (!effectivePath?.toString().includes(parts[i])) {
      effectivePath = effectivePath ? `${effectivePath}.${parts[i]}` : parts[i];
    }
  }


  return effectivePath;
}

const validateConditionValue = (condition: any, effectivePath = "", formData: any) => {
  if (!condition) {
    return true;
  }

  const fieldValue = getValueByPath(formData, effectivePath);

  switch (condition.operator) {
    case "exists": {
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }

      return fieldValue !== undefined && fieldValue !== null;
    }
    case "not_exists": {
      if (Array.isArray(fieldValue)) {
        return fieldValue.length === 0;
      }

      return fieldValue === undefined || fieldValue === null;
    }
    case "eq": {
      const isString = condition.value?.string === true;
      if (isString) {
        return fieldValue === condition.value?.stringValue;
      }

      return fieldValue === condition.value?.booleanValue;
    }
    case "neq": {
      const isString = condition.value?.string === true;
      if (isString) {
        return fieldValue !== condition.value?.stringValue;
      }

      return fieldValue !== condition.value?.booleanValue;
    }
    default:
      return true;
  }
}

export const evaluateConditions = (field: FieldConfig, formData: any, path?: string) => {
  if (!field.condition) {
    return true;
  }

  let effectivePath = field.parentId;

  if (field.parentId && field.parentId.includes('$INDEX')) {

    const parentParts = path?.match(/\[(\d+)\]/g)?.map(s => Number(s.replace(/\[|\]/g, ""))) ?? [];
    let idx = 0;
    effectivePath = field.parentId.replace(/\$INDEX/g, () => (parentParts as any)[idx++] ?? '0');

  }

  const { condition } = field;

  effectivePath = calculateEffectivePath(condition, effectivePath);

  if (condition.field && !condition.value?.conditionArray?.length) {
    return validateConditionValue(condition, effectivePath, formData);
  }

  if (condition?.value?.conditionArray) {
    const results = condition.value.conditionArray.map((child: any) => {
      const childEffectivePath = calculateEffectivePath(child, effectivePath);
      return validateConditionValue(child, childEffectivePath, formData);
    });

    switch (condition.operator) {
      case "and": {
        return results.every(Boolean);
      }
      case "or": {
        return results.some(Boolean);
      }
      default:
        break;
    }
  }

  return true;
}
