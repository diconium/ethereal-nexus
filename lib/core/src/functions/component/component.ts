import { BaseSchema, ComponentModel } from '../../types';
import { ObjectEntries, ObjectOutput } from '../../types/object';
import { DialogSchema } from '../../schema/dialog';
import { DynamicZoneSchema } from '../../schema/dynamic';
import { DynamicZonesSchema } from '../../schema/dynamiczones';

export interface ComponentSchema<TEntries extends ObjectEntries, TOutput = ObjectOutput<TEntries>> extends BaseSchema<TOutput>, Partial<ComponentModel> {
  type: 'component';
  dialog: Omit<DialogSchema<TEntries>, 'tabs'>;
  dynamiczones:  Omit<DynamicZonesSchema<{    [key: string]: DynamicZoneSchema}>,'dynamiczones'>,
}

export function component<TEntries extends ObjectEntries>(
  config: Partial<ComponentModel>,
  dialogInstance: Omit<DialogSchema<TEntries>, 'tabs'>,
  dynamicZonesInstance: Omit<DynamicZonesSchema<{    [key: string]: DynamicZoneSchema}>,'dynamiczones'>,
): ComponentSchema<TEntries> {

  return {
    type: 'component',
    dialog: dialogInstance,
    dynamiczones: dynamicZonesInstance,
    _parse() {
      return {
        ...config,
        ...dialogInstance._parse(),
        ...dynamicZonesInstance._parse()
      };
    },
    _primitive() {
      return {
        ...dialogInstance._primitive() as object,
        ...dynamicZonesInstance._primitive() as object,
      };
    },
    ...config,
  };
}