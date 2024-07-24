import { BaseSchema, EntryMask } from '../../types';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries, ObjectOutput } from '../../types/object';

export interface DynamicZonesSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'dynamiczones';
}

export function dynamiczones<TEntries extends ObjectEntries>(entries: TEntries): DynamicZonesSchema<TEntries> {
  return {
    type: 'dynamiczones',
    _parse() {
      const dynamiczones = Object.entries(entries)
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
        dynamiczones
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