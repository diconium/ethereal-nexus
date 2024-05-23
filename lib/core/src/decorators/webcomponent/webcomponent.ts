import type React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import { DialogSchema } from '../../schema/dialog';
import { pascalToKebab } from '../../utils/pascalToKebab';
import { parsePrimitives } from '../../functions';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries } from '../../types/object';

type BaseOptions = {}

export function webcomponent<T extends ObjectEntries>(schema: DialogSchema<T>, options?: BaseOptions) {
  const props: Record<string, WebcomponentPropTypes> = {
    ...parsePrimitives(schema),
  };

  return <P extends {} = {}>(component: React.ComponentType<P>) => {
    const name = pascalToKebab(component.displayName!)

    if (!window.customElements.get(name)) {
      customElements.define(
        name,
        r2wc(component, {
          props,
        }),
      );
    }
  }
}