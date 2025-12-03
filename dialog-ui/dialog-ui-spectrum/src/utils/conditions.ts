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
  const fieldValue = getValueByPath(formData, effectivePath);

  const { string: isString, stringValue, booleanValue } = condition.value;

  switch (condition.operator) {
    case "eq": {
      if (isString && fieldValue !== stringValue || !isString && fieldValue !== booleanValue) {
        return false;
      }
      break;
    }
    case "neq": {
      if (isString && fieldValue === stringValue || !isString && fieldValue === booleanValue) {
        return false;
      }
      break;
    }
    default:
      break;
  }

  return true;
}

export const evaluateConditions = (field: FieldConfig, formData: any, path?: string) => {
  debugger;
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