import type { BaseSchema } from '../../types';
import { DialogEntries, DialogOutput } from './types';
import { WebcomponentPropTypes } from '../../types/webcomponent';

export interface DialogSchema<TEntries extends DialogEntries, TOutput = DialogOutput<TEntries>> extends BaseSchema<TOutput> {
  type: 'dialog';
}

export function dialog<TEntries extends DialogEntries>(entries: TEntries): DialogSchema<TEntries> {
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