import React from 'react';
import {View, Text, Tabs, TabList, TabPanels, Item} from '@adobe/react-spectrum';
import {SpectrumFieldRendererComponent, FieldRendererProps} from './SpectrumFieldRenderer';
import {useI18n} from '../providers';

const SpectrumFieldTabs: React.FC<FieldRendererProps> = ({field, value, onChange, error, path, page}) => {
    const {t} = useI18n();
    // Tabs should not manage their own value - they should pass the original value through
    // to their children since tabs are just UI containers, not data containers
    const tabChildren = Array.isArray(field.children) ? field.children : [];

    // If no children, render empty tabs message
    if (tabChildren.length === 0) {
        return (
            <View>
                {field.label && (
                    <Text UNSAFE_style={{fontWeight: 'bold', fontSize: '16px', marginBottom: '12px'}}>
                        {t(field.label)}
                    </Text>
                )}
                <Text>{t('spectrum.tabs.noTabsConfigured') || 'No tabs configured'}</Text>
            </View>
        );
    }

    return (
        <View>
            {field.tooltip && (
                <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '12px'}}>
                    {t(field.tooltip)}
                </Text>
            )}
            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '12px'}}>
                    {error}
                </Text>
            )}
            <Tabs aria-label={t(field.label ?? '') || 'Dialog Tabs'}>
                <TabList>
                    {tabChildren.map((tab: any) => {
                        if (!tab || !tab.id) return null;
                        return (
                            <Item key={tab.id}>{t(tab.label ?? '') || tab.id}</Item>
                        );
                    }).filter(Boolean)}
                </TabList>
                <TabPanels>
                    {tabChildren.map((tab: any) => {
                        if (!tab || !tab.id) return null;
                        // Extract values for this tab's children
                        const tabValue: any = {};
                        if (Array.isArray(tab.children)) {
                            tab.children.forEach((child: any) => {
                                const fieldKey = child.id || child.name;

                                if (value) {
                                    if (child.type === 'datamodel') {
                                        const dataModelKey = `cf_${fieldKey}`;
                                        if (value.hasOwnProperty(dataModelKey)) {
                                            // Extract the fragmentPath from the datamodel object
                                            const dataModelValue = value[dataModelKey];
                                            tabValue[fieldKey] = dataModelValue?.fragmentPath || dataModelValue;
                                        }
                                    } else {
                                        tabValue[fieldKey] = value[fieldKey];
                                    }
                                }
                            });
                        }
                        return (
                            <Item key={tab.id}>
                                <View padding="size-200">
                                    <SpectrumFieldRendererComponent
                                        field={tab}
                                        value={tabValue}
                                        onChange={onChange}
                                        path={path}
                                        page={page}
                                    />
                                </View>
                            </Item>
                        );
                    }).filter(Boolean)}
                </TabPanels>
            </Tabs>
        </View>
    );
};

export default SpectrumFieldTabs;
