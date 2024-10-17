import type React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import { DialogSchema } from '../../schema/dialog';
import { pascalToKebab } from '../../utils/pascalToKebab';
import { parsePrimitives } from '../../functions';
import { WebcomponentPropTypes } from '../../types/webcomponent';
import { ObjectEntries } from '../../types/object';

type BaseOptions = {}

export function webcomponent<T extends ObjectEntries>(schema?: DialogSchema<T>, options?: BaseOptions) {
  const props: Record<string, WebcomponentPropTypes> | undefined = schema ? {
    ...parsePrimitives(schema),
  } : undefined;

  return <P extends {} = {}>(component: React.ComponentType<P>) => {
    const name = pascalToKebab(component.displayName!);

    class StyledWebComponent extends r2wc(component, {
      shadow: 'open',
      props,
    }) {
      connectedCallback() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super.connectedCallback();
        queueMicrotask(() => {

          const cssUrlsAttr = this.getAttribute('data-css-urls');
          if (cssUrlsAttr) {
            const cssUrlsArray: string[] = JSON.parse(cssUrlsAttr.replace(/'/g, '"'));
            const slotTemplate = document.createElement('template');
            const getImportsFromUrlsArray = (urls: string[]) => urls.map((url) => `<link rel="preload" as="style" onload="this.rel='stylesheet'" type="text/css" href="${url}">`).join('\n');
            slotTemplate.innerHTML = `<style>
                ::slotted(*) {
                  display: block !important;
                }
              </style>
                ${getImportsFromUrlsArray(cssUrlsArray)}
`;
            this.shadowRoot?.appendChild(slotTemplate.content.cloneNode(true));
          }
        });
      }
    }


    if (!window.customElements.get(name)) {
      customElements.define(
        name, StyledWebComponent,
      );
    }
  };
}