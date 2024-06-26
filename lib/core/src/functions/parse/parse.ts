import { DialogSchema } from '../../schema/dialog';
import { ObjectEntries } from '../../types/object';

export function parse<T extends ObjectEntries>(schema: DialogSchema<T>) {
  return schema._parse()
}