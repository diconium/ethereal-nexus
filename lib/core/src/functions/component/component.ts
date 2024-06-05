import { BaseSchema, ComponentModel } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';
import { DialogSchema } from '../../schema/dialog';

export interface ComponentSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput>, Partial<ComponentModel> {
  type: 'component';
  dialog: Omit<DialogSchema<TEntries>, 'tabs'>;
}

export function component<TEntries extends ObjectEntries>(
  config: Partial<ComponentModel>,
  dialogInstance: Omit<DialogSchema<TEntries>, 'tabs'>
): ComponentSchema<TEntries> {

  return {
    type: 'component',
    dialog: dialogInstance,
    _parse() {
      return {
        ...config,
        ...dialogInstance._parse()
      };
    },
    _primitive() {
      return dialogInstance._primitive();
    },
    ...config,
  };
}