import { BaseSchema, EntryMask } from '../../types';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries, ObjectOutput } from '../../types/object';

export interface DialogSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'dialog';
  tabs: (tabs: Record<string, EntryMask<TEntries>>) => Omit<DialogSchema<TEntries>, 'tabs'>;
}

export function dialog<TEntries extends ObjectEntries>(entries: TEntries): DialogSchema<TEntries> {
  return {
    type: 'dialog',
    tabs(tabs) {
      return {
        ...this,
        tabs: undefined,
        component: undefined,
        _parse() {
          const usedEntries = new Set<keyof TEntries>();

          const tabsArray = Object.entries(tabs)
            .map(([tabKey, value]) => {

              const children = Object.entries(value).map(([key, value]) => {
                if (value === true) {
                  if (usedEntries.has(key)) {
                    throw new Error(`Entry "${String(tabKey)}.${String(key)}" is already used in another tab.`);
                  }
                  usedEntries.add(key);
                  return {
                    id: key,
                    ...entries[key]._parse()
                  };
                }
              });

              return {
                type: 'tab',
                label: tabKey,
                id: `tab_${tabKey.toLowerCase().replaceAll(' ', '')}`,
                children
              };
            });

          return {
            dialog: [{
              type: 'tabs',
              id: 'tabs',
              children: tabsArray
            }]
          };
        }
      };
    },
    _parse() {
      const dialog = Object.entries(entries)
        .map(([key, entry]) => ({
          id: key,
          name: key,
          ...entry._parse()
        }))
        .filter((entry: object) => {
          if ('type' in entry) {
            return entry.type !== 'hidden';
          }
        });

      return {
        dialog
      };
    },
    _primitive() {
      return Object.entries(entries)
        .reduce(
          (acc: Record<string, WebcomponentPropTypes>, [key, entry]) => {
            const type = entry._primitive();
            if (typeof type === 'string') {
              acc[key] = type;
            }
            return acc;
          }, {});
    }
  };
}