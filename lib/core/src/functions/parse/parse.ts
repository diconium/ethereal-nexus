import { DialogSchema, DialogEntries } from '../../schema/dialog';

export function parse<T extends DialogEntries>(schema: DialogSchema<T>) {
  return {
    dialog: schema._parse()
  }
}