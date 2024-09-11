import { BaseSchema, EntryMask } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';
import { Tabs } from './tabs';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { Condition, Conditions, Field, NestedPaths } from '../condition';
import { pathToArray } from '../../utils/pathToArray';

export interface DialogSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'dialog';
  tabs: any
  conditions: any
}

// export function dialog<TEntries extends ObjectEntries>(entries: TEntries): DialogSchema<TEntries> {
//   return {
//     type: 'dialog',
//     conditions(conditions) {
//       // Apply conditions to the corresponding entries
//       for (const [key, condition] of Object.entries(conditions)) {
//         const entry = entries[key as keyof TEntries];
//         if (entry && condition) {
//           entry.condition = Array.isArray(condition) ? condition : [condition];
//         }
//       }
//
//       return {
//         ...this,
//         conditions: undefined, // Remove the conditions method after it's used
//         component: undefined,
//       };
//     },
//     tabs(tabs) {
//       return {
//         ...this,
//         tabs: undefined, // Remove the tabs method after it's used
//         component: undefined,
//         _parse() {
//           const usedEntries = new Set<keyof TEntries>();
//
//           const tabsArray = Object.entries(tabs)
//             .map(([tabKey, value]) => {
//               const children = Object.entries(value).map(([key, value]) => {
//                 if (value === true) {
//                   if (usedEntries.has(key)) {
//                     throw new Error(`Entry "${String(tabKey)}.${String(key)}" is already used in another tab.`);
//                   }
//                   usedEntries.add(key);
//                   return {
//                     id: key,
//                     ...entries[key]._parse(),
//                     conditions: entries[key].condition // Include conditions in the parsed output
//                   };
//                 }
//               });
//
//               return {
//                 type: 'tab',
//                 label: tabKey,
//                 id: `tab_${tabKey.toLowerCase().replaceAll(' ', '')}`,
//                 children
//               };
//             });
//
//           return {
//             dialog: [{
//               type: 'tabs',
//               id: 'tabs',
//               children: tabsArray
//             }]
//           };
//         }
//       };
//     },
//     _parse() {
//       const dialog = Object.entries(entries)
//         .map(([key, entry]) => ({
//           id: key,
//           name: key,
//           ...entry._parse(),
//           conditions: entry.condition // Include conditions in the parsed output
//         }))
//         .filter((entry: object) => {
//           if ('type' in entry) {
//             return entry.type !== 'hidden';
//           }
//         });
//
//       return {
//         dialog
//       };
//     },
// }

class DialogBuilder<TEntries extends ObjectEntries> {
  private entries: TEntries;
  private conditionsModule: Condition<TEntries>;
  private tabsModule: Tabs<TEntries>;
  readonly type = 'dialog';

  constructor(entries: TEntries) {
    this.entries = entries;
    this.conditionsModule = new Condition<TEntries>();
    this.tabsModule = new Tabs<TEntries>();
  }

  conditions(conditions: Partial<Record<keyof TEntries, Conditions>>) {
    const conditionsArray = pathToArray(conditions)
    for (const condition of conditionsArray) {
      this.conditionsModule.addCondition(condition.path.join('.') as NestedPaths<TEntries>, condition.value);
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