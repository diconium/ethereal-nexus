export interface Conditions {
  field: string;
  operator: 'eq' | 'neq' | 'and' | 'or';
  value: any;
}

export type NestedPaths<T> = T extends object ?
  {  [K in keyof T & string]: K | `${K}.${NestedPaths<T[K]>}` }[keyof T & string] :
  never;

export type Field = { id: string, condition?: Conditions, children: Field[] }

function addConditionToField(fields: Field[], path: string, condition: Conditions): void {
  const keys = path.split('.');
  let currentFields = fields;

  // Traverse the fields and their children
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
      currentFields = field.children;
    }
  }
}

export class Condition<TEntries> {
  private conditions = new Map<string, Conditions>();

  addCondition(field: NestedPaths<TEntries>, condition: Conditions) {
    this.conditions.set(field, condition);
  }

  parse(entries: Field[]) {
    for (let [key, value] of this.conditions) {
      addConditionToField(entries, key, value)
    }

    return entries;
  }

}