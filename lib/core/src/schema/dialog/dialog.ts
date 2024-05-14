import type { BaseSchema } from '../../types/schema';
import { DialogEntries, DialogOutput } from './types';
import { WebcomponentPropTypes } from '../../types/webcomponent';

export interface DialogSchema<TEntries extends DialogEntries> extends BaseSchema<DialogOutput<TEntries>> {
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
        }));
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