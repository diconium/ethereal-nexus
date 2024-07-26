import { BaseSchema, ComponentModel } from '../../types';
import { ObjectEntries, ObjectOutput, SlotEntries } from '../../types/object';
import { DialogSchema } from '../../schema/dialog';
import { WebcomponentPropTypes } from '../../types/webcomponent';

export interface ComponentSchema<TEntries extends ObjectEntries, TSlots extends SlotEntries, TOutput = ObjectOutput<TEntries & TSlots>> extends BaseSchema<TOutput>, Partial<ComponentModel> {
  type: 'component';
  dialog: Omit<DialogSchema<TEntries>, 'tabs'>;
  slots: TSlots,
}

export function component<TEntries extends ObjectEntries, TSlots extends SlotEntries>(
  config: Partial<ComponentModel>,
  dialog: Omit<DialogSchema<TEntries>, 'tabs'>,
  slots: TSlots,
): ComponentSchema<TEntries, TSlots> {

  const slotsParse = Object.entries(slots).map(([key, slot]) => (
    {
      id: key,
      name: key,
      ...slot._parse(),
    }),
  );
  const slotsPrimitives = Object.entries(slots).reduce((acc, [key, slot]) => {
    acc[key] = slot._primitive();
    return acc
  }, {} as Record<string, WebcomponentPropTypes | Record<string, WebcomponentPropTypes>>)

  return {
    type: 'component',
    dialog,
    slots,
    _parse() {
      return {
        ...config,
        ...dialog._parse(),
        dynamiczones: slotsParse,
      };
    },
    _primitive() {
      return {
        ...dialog._primitive() as object,
        ...slotsPrimitives as object,
      };
    },
    ...config,
  };
}