import type { BaseSchema } from '../../types';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries, ObjectOutput } from '../../types/object';

export interface DialogSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'dialog';
}

export function dialog<TEntries extends ObjectEntries>(entries: TEntries): DialogSchema<TEntries> {
  return {
    type: 'dialog',
    _parse() {
      return Object.entries(entries)
        .map(([key, entry]) => ({
          id: key,
          name: key,
          ...entry._parse()
        }))
        .filter((entry: object) => {
          if('type' in entry){
            return entry.type !== 'hidden'
          }
        })
    },
    _primitive() {
      return Object.entries(entries)
        .reduce(
          (acc: Record<string, WebcomponentPropTypes>, [key, entry]) => {
            const type = entry._primitive();
            if(typeof type === 'string') {
              acc[key] = type;
            }
            return acc;
          }, {});
    }
  };
}