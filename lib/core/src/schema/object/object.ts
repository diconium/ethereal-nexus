import type { BaseSchema } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';

export interface ObjectSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'object';
}

export function object<TEntries extends ObjectEntries>(entries: TEntries): ObjectSchema<TEntries> {
  return {
    type: 'object',
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
      return 'json'
    }
  };
}