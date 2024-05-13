import type React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import { DialogEntries, DialogSchema } from '../../schema/dialog';
import { pascalToKebab } from '../../utils/pascalToKebab';
import { parsePrimitives } from '../../functions';
import { WebcomponentPropTypes } from '../../types/webcomponent';

type BaseOptions = {
  props?: {
    [key: string]: WebcomponentPropTypes
  }
}

export function webcomponent<T extends DialogEntries, P extends {} = {}>(schema: DialogSchema<T>, component: React.ComponentType<P>, options: BaseOptions) {
  const name = pascalToKebab(component.displayName!)
  const props: Record<string, WebcomponentPropTypes> = {
    ...parsePrimitives(schema),
    ...options.props,
  };

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