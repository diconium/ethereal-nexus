import type React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import { DialogEntries, DialogSchema } from '../../schema/dialog';
import { pascalToKebab } from '../../utils/pascalToKebab';
import { parsePrimitives } from '../../functions';

export function webcomponent<T extends DialogEntries, P extends {} = {}>(schema: DialogSchema<T>, component: React.ComponentType<P>) {
  const name = pascalToKebab(component.displayName!)
  const props = parsePrimitives(schema);

  console.log(props)
  if (!window.customElements.get(name)) {
    customElements.define(
      name,
      r2wc(component, {
        props,
      }),
    );
  }
}