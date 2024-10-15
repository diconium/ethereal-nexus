import { BaseSchema, ComponentModel } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';
import { DialogSchema } from '../../schema/dialog';

export interface ComponentSchema<TEntries extends ObjectEntries> extends BaseSchema<ObjectOutput<TEntries>>, Partial<ComponentModel> {
  type: 'component';
  dialog: DialogSchema<TEntries>;
}

export function component<TEntries extends ObjectEntries>(
  config: Partial<ComponentModel>,
  dialog: DialogSchema<TEntries>,
): ComponentSchema<TEntries> {

  return {
    type: 'component',
    dialog,
    _parse() {
      return {
        ...config,
        ...dialog._parse(),
      };
    },
    _primitive() {
      return {
        ...dialog._primitive() as object,
      };
    },
    ...config,
  };
}