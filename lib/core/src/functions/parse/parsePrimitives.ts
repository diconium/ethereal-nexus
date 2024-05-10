import { DialogSchema, DialogEntries } from '../../schema/dialog';
import { WebcomponentPropTypes } from '../../types/webcomponent';

export function parsePrimitives<T extends DialogEntries>(schema: DialogSchema<T>) {
  return schema._primitive() as Record<string, WebcomponentPropTypes>
}