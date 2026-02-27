// @ts-nocheck
import React, { useId, useRef, useState } from 'react';
import { View, Flex } from '@adobe/react-spectrum';
import { useI18n } from '@/providers';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'foundation-autocomplete': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        name?: string;
        multiple?: string;
        pickersrc?: string;
        labelledby?: string;
        valuedisplaymode?: string;
        // Add other attributes your web component supports
      };
    }
  }
}

export interface SpectrumTagsFieldProps {
  field: any;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const SpectrumTagsField: React.FC<SpectrumTagsFieldProps> = ({ field, value, onChange }) => {
  const inputRef = useRef<any>(null);
  const { t } = useI18n();
  const labelId = useId();
  const rootPath = field.rootPath || '/content/cq:tags';
  const tags = Array.isArray(value) ? value : (value ? value.split(',').map(v => v.trim()).filter(Boolean) : []);
  const [tagItems, setTagItems] = useState(tags.map((tag, index) => ({ id: index, name: tag })));
  console.log('field.multiple', field.multiple);
  console.log('field.multiple', field.multiple ? 'true' : undefined);
  return (
    <View>
      <Flex gap="size-100" direction="column">
        <div className="coral-Form-fieldwrapper">
          <label id={labelId} className="coral-Form-fieldlabel">
            {t(field.label ?? 'Tags')}
          </label>
          <foundation-autocomplete
            className="coral-Form-field cq-ui-tagfield"
            name={field.name}
            multiple={field.multiple ? 'true' : undefined}
            pickersrc={`/mnt/overlay/cq/gui/content/coral/common/form/tagfield/picker.html?root=${encodeURIComponent(rootPath)}&selectionCount=${field.multiple ? 'multiple' : 'single'}`}
            labelledby={labelId}
            valuedisplaymode="block"
            data-foundation-validation=""
            ref={inputRef}
            onChange={e => {
              let newValue = e?.target?.value || '';
              if(field.multiple) {
                newValue = e?.target?.values || '';
              }
              onChange(newValue);
            }}
          >
            <coral-overlay
              foundation-autocomplete-suggestion=""
              className="foundation-picker-buttonlist"
              data-foundation-picker-buttonlist-src={`/mnt/overlay/cq/gui/content/coral/common/form/tagfield/suggestion{.offset,limit}.html?root=${encodeURIComponent(rootPath)}{&query}`}
            ></coral-overlay>
            <coral-taglist foundation-autocomplete-value="" name={field.name}>
              {tagItems.map(({ name, id }) => (
                <coral-tag key={id} multiline value={name}>
                  <coral-tag-label>{name}</coral-tag-label>
                </coral-tag>
              ))}
            </coral-taglist>
          </foundation-autocomplete>
        </div>
      </Flex>
    </View>
  );
};
