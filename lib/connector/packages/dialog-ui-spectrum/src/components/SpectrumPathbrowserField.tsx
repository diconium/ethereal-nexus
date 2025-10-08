// @ts-nocheck
import React, {useEffect, useRef} from 'react';
import {View, Text, Flex} from "@adobe/react-spectrum";
import {useI18n} from '../providers';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "foundation-autocomplete": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            > & {
                name?: string;
                // Add other attributes your web component supports
            };
        }
    }
}

export interface SpectrumPathbrowserFieldProps {
    field: any;
    value: string;
    onChange: (value: string) => void;
    error?: string | null;
}

export const SpectrumPathbrowserField: React.FC<SpectrumPathbrowserFieldProps> = ({field, value, onChange, error}) => {
    const inputRef = useRef<any>(null);
    const {t} = useI18n();

    return (
        <View>
            <Text UNSAFE_style={{fontSize: '12px', marginBottom: '8px'}}>
                {t(field.label ?? '')}
            </Text>
            {field.tooltip && (
                <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                    {t(field.tooltip ?? '')}
                </Text>
            )}
            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {error}
                </Text>
            )}
            <Flex gap="size-100" alignItems="center">
                {/*TODO: add support for assets*/}
                <foundation-autocomplete
                    className="spectrum-pathbrowser"
                    style={{width: '100%'}}
                    name={field.name}
                    pickersrc={`/libs/granite/ui/content/coral/foundation/form/pathfield/picker.html?_charset_=utf-8&path=${encodeURIComponent(value)}&root=${encodeURIComponent(field.rootPath || '/content')}&selectionCount=single`}
                    labelledby={field.labelledby || ''}
                    data-foundation-validation=""
                    ref={inputRef}
                    onChange={e => {
                        // Try to get value from event or input
                        const newValue = e?.detail?.value || e?.target?.value || '';
                        onChange(newValue);
                    }}
                >
                    <coral-overlay
                        foundation-autocomplete-suggestion=""
                        className="foundation-picker-buttonlist"
                        data-foundation-picker-buttonlist-src={`/libs/granite/ui/content/coral/foundation/form/pathfield/suggestion{.offset,limit}.html?root=${encodeURIComponent(field.rootPath || '/content')}{&query}`}
                    ></coral-overlay>
                    <coral-taglist
                        foundation-autocomplete-value=""
                        name={field.name}
                    >
                        <coral-tag value={value}></coral-tag>
                    </coral-taglist>
                </foundation-autocomplete>
            </Flex>
            <style>{`
                .spectrum-pathbrowser input[is="coral-textfield"] {
                    font-family: var(--spectrum-font-family, "Adobe Clean", Arial, sans-serif);
                    font-size: var(--spectrum-textfield-text-size,var(--spectrum-alias-font-size-default));
                    background: var(--spectrum-global-color-gray-50, #fff);
                    border: 1px solid var(--spectrum-global-color-gray-400, #d1d1d1);
                    border-top-left-radius: 4px;
                    border-bottom-left-radius: 4px;
                    padding: 8px 12px;
                    color: var(--spectrum-global-color-gray-900, #222);
                    box-shadow: none;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .spectrum-pathbrowser input[is="coral-textfield"]:focus {
                    border-color: var(--spectrum-global-color-blue-400, #2680eb);
                    box-shadow: 0 0 0 2px var(--spectrum-global-color-blue-200, #cce4ff);
                }
            `}</style>
        </View>
    );
};
