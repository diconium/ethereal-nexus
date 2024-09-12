import { AddType, BaseSchema, DeepPartial, EntryMask, Leaves, PathValue, UnArray } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';
import { Tabs } from './tabs';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { Condition, Conditions, Field, NestedPaths } from '../condition';
import { pathToArray } from '../../utils/pathToArray';

export interface ConditionOperators<TEntries extends ObjectEntries = any> {
  eq: <P extends Leaves<UnArray<ObjectOutput<TEntries>>>>(
    field: P,
    value: PathValue<UnArray<ObjectOutput<TEntries>>, P>
  ) => Conditions;
}

type ConditionFn<TEntries extends ObjectEntries> = (ops: ConditionOperators<TEntries>) => Conditions;

type ConditionsArgument<TEntries extends ObjectEntries> = AddType<UnArray<DeepPartial<ObjectOutput<TEntries>>>, ConditionFn<TEntries>>

export interface DialogSchema<TEntries extends ObjectEntries> extends BaseSchema<ObjectOutput<TEntries>> {
  type: 'dialog';
  tabs: (tabs: Record<string, EntryMask<TEntries>>) => DialogSchema<TEntries>;
  conditions: (conditions: ConditionsArgument<TEntries>) => DialogSchema<TEntries>;
}

class DialogBuilder<TEntries extends ObjectEntries> {
  private conditionsModule: Condition<TEntries>;
  private tabsModule: Tabs<TEntries>;
  private readonly entries: TEntries;
  readonly type = 'dialog';

  constructor(entries: TEntries) {
    this.entries = entries;
    this.conditionsModule = new Condition<TEntries>();
    this.tabsModule = new Tabs<TEntries>();
  }

  conditions(conditions: ConditionsArgument<TEntries>) {
    const operators: ConditionOperators<TEntries> = {
      eq: (field, value) => ({ operator: 'eq', field, value }),
    };

    const conditionsArray = pathToArray(conditions)
    for (const condition of conditionsArray) {
      this.conditionsModule.addCondition(condition.path.join('.') as NestedPaths<TEntries>, condition.value(operators));
    }
    return this;
  }

  tabs(tabs: Record<string, EntryMask<TEntries>>) {
    for (const [key, tab] of Object.entries(tabs)) {
      this.tabsModule.addTab(key as any, tab!);
    }
    return this;
  }

  _parse() {
    const dialog = Object.entries(this.entries)
      .map(([key, entry]) => ({
        id: key,
        name: key,
        ...entry._parse(),
      }))
      .filter((entry: object) => {
        if ('type' in entry) {
          return entry.type !== 'hidden';
        }
      });

    const dialogWithConditions = this.conditionsModule.parse(dialog as unknown as Field[]);
    const dialogWithTabs = this.tabsModule.parse(dialogWithConditions);
    return {
      dialog: dialogWithTabs
    };
  }

  _primitive() {
    const result: Record<string, WebcomponentPropTypes> = {};

    for (const [key, entry] of Object.entries(this.entries)) {
      const type = entry._primitive();
      if (typeof type === 'string') {
        result[key] = type;
      }
    }

    return result;
  }
}

export function dialog<TEntries extends ObjectEntries>(entries: TEntries): DialogSchema<TEntries> {
  return new DialogBuilder(entries)
}