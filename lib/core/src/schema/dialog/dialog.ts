import type { BaseSchema } from '../../types/schema';
import { DialogEntries, DialogOutput } from './types';

export interface DialogSchema<TEntries extends DialogEntries> extends BaseSchema<DialogOutput<TEntries>> {
  type: 'dialog';
}

export function dialog<TEntries extends DialogEntries>(entries: TEntries): DialogSchema<TEntries> {
  return {
    type: 'dialog',
  }
}