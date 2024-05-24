import { DialogSchema } from '../../schema/dialog';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries } from '../../types/object';

export function parsePrimitives<T extends ObjectEntries>(schema: DialogSchema<T>) {
  return schema._primitive() as Record<string, WebcomponentPropTypes>
}