import { NestedPaths } from '../../types';
import { ConditionFn, ConditionOperators, Conditions, Field } from './types';
import { ObjectEntries } from '../../types/object';

function addConditionToField(fields: Field[], path: string, condition: Conditions): void {
  const keys = path.split('.');
  let currentFields = fields;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const field = currentFields.find(f => f.id === key);

    if (!field) {
      throw new Error(`Field with id "${key}" not found`);
    }

    if (i === keys.length - 1) {
      field.condition = condition;
    } else {
      if (!field.children) {
        throw new Error(`Field with id "${key}" has no children`);
      }

      const nextKey = keys[i + 1];
      if(nextKey === '$this') {
        field.condition = condition;
        break;
      }
      currentFields = field.children;
    }
  }
}

export class Condition<TEntries extends ObjectEntries> {
  private conditions = new Map<string, Conditions>();

  addCondition(field: NestedPaths<TEntries>, condition: ConditionFn<TEntries>) {
    const operators: ConditionOperators<TEntries> = {
      eq: (field, value) => ({ operator: 'eq', field, value }),
      neq: (field, value) => ({ operator: 'neq', field, value }),
      exists: (field) => ({ operator: 'exists', field }),
      and: (...operations) => ({ operator: 'and', value: operations }),
      or: (...operations) => ({ operator: 'or', value: operations })
    };

    this.conditions.set(field, condition(operators));
  }

  parse(entries: Field[]) {
    for (let [key, value] of this.conditions) {
      addConditionToField(entries, key, value)
    }

    return entries;
  }
}
