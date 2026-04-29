import React, {useState, useCallback} from 'react';
import {
    Switch,
    Text,
    View,
    Flex,
    ContextualHelp,
    Heading,
    Content,
    Disclosure,
    DisclosureTitle,
    DisclosurePanel, Accordion,
} from "@adobe/react-spectrum";
import {FieldRendererProps} from '@ethereal-nexus/dialog-ui-core';
import {useI18n} from '../providers';
import {handleIsolationCSS} from './popoverUtils';

export interface SpectrumGroupFieldProps extends FieldRendererProps {
    FieldRendererComponent?: React.ComponentType<FieldRendererProps>;
}

export const SpectrumGroupField: React.FC<SpectrumGroupFieldProps> = ({
                                                                          field,
                                                                          value,
                                                                          onChange,
                                                                          error,
                                                                          path,
                                                                          FieldRendererComponent
                                                                      }) => {
    const {t} = useI18n();

    // Extract group-specific data from the value
    // Since tabs are now transparent, we might receive the entire formData
    const fieldId = field.id || field.name;
    let groupData = value ?? {};

    console.log(`🔸 [SpectrumGroupField] Component initialized:`, {
        fieldId: fieldId,
        fieldLabel: field.label,
        receivedValue: value,
        valueType: typeof value,
        isValueArray: Array.isArray(value),
        hasChildren: !!field.children,
        childrenCount: field.children?.length || 0,
        path: path
    });

    // If value contains the group data nested under the field ID, extract it
    if (value && value[fieldId] && typeof value[fieldId] === 'object') {
        groupData = value[fieldId];
        console.log(`🔸 [SpectrumGroupField] Extracted group data from value[${fieldId}]:`, groupData);
    }
    // If value is in remote.groupId structure (AEM format), extract it
    else if (value && value.remote && value.remote[fieldId]) {
        groupData = value.remote[fieldId];
        console.log(`🔸 [SpectrumGroupField] Extracted group data from value.remote[${fieldId}]:`, groupData);
    } else {
        console.log(`🔸 [SpectrumGroupField] Using value directly as group data:`, groupData);
    }

    console.log(`🔸 [SpectrumGroupField] Final extracted group data:`, groupData);

    // Always show toggle for groups
    //TODO: think about how to handle toggle state in a more robust way
    const toggleStateKey = `active`;

    // Local state to control accordion expansion when group is active
    // Default should be false unless groupData[toggleStateKey] is explicitly true
    const [isGroupActive, setIsGroupActive] = useState(groupData[toggleStateKey] === true);

    console.log(`🔸 [SpectrumGroupField] Group state:`, {
        toggleStateKey: toggleStateKey,
        groupActiveValue: groupData[toggleStateKey],
        isGroupActive: isGroupActive,
    });


    const buildFormData = useCallback((childName: string, childValue: any) => {

        console.log(`🔸 [SpectrumGroupField] buildFormData called:`, childName, childValue);
        console.log(`🔸 [SpectrumGroupField] Current value structure:`, value);
        console.log(`🔸 [SpectrumGroupField] Current field value:`, value?.remote?.[fieldId]);
        if (value?.remote?.[fieldId]) {
            // AEM remote structure
            return {
                ...value,
                remote: {
                    ...value.remote,
                    [fieldId]: {
                        ...value.remote[fieldId],
                        remote: {
                            ...value.remote[fieldId].remote,
                            [childName]: childValue
                        }
                    }
                }
            };
        }  else {

            // Direct structure
            return {...value, [childName]: childValue};
        }
    }, [value])

    const updateChildValue = useCallback((childName: string, childValue: any) => {
        console.log(`🔸 [SpectrumGroupField] updateChildValue called:`, {
            childName,
            childValue,
            currentGroupData: groupData
        });

        const childField = field.children?.find(child => child.id === childName || child.name === childName);
        if (childField?.type === "datamodel") {
            childName = `cf_${childName}`;
            childValue = Object.values(childValue)[0];
            console.log(`🔸 [SpectrumGroupField] Processed datamodel field:`, {childName, childValue});
        }

        let newFormData = buildFormData(childName, childValue);

        console.log(`🔸 [SpectrumGroupField] Calling onChange with:`, newFormData);
        onChange(newFormData);
    }, [field, onChange]);

    const handleToggleChange = useCallback(() => {
        console.log(`🔸 [SpectrumGroupField] Toggle changed from ${isGroupActive} to ${!isGroupActive}`);

        const newActiveState = !isGroupActive;
        setIsGroupActive(newActiveState);

        let newFormData;

        if (value && value.remote && value.remote[fieldId]) {
            // AEM remote structure
            newFormData = {
                ...value,
                remote: {
                    ...value.remote,
                    [fieldId]: {
                        ...value.remote[fieldId],
                        active: newActiveState
                    }
                }
            };
        } else {
            // Fix: Update at current level, don't wrap in fieldId
            newFormData = {...value, active: newActiveState};
        }

            console.log(`🔸 [SpectrumGroupField] Toggle update - calling onChange with:`, newFormData);
        onChange(newFormData);
    }, [value, onChange, isGroupActive]);

    const getGroupFieldValue = (childField: any, groupData: any) => {
        console.log(`🔸 [SpectrumGroupField] getGroupFieldValue called for childField:`, childField);
        const fieldKey = childField.id || childField.name;
        return childField.type === 'datamodel'
            ? groupData[`cf_${fieldKey}`]
            : groupData[fieldKey];
    };

    return (
        <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="medium"
            marginBottom="size-200"
            paddingX="size-200"
        >
            <Flex direction={"row"} gap="size-10" alignItems="start">
                <Switch
                    marginTop={"size-100"}
                    isSelected={isGroupActive}
                    onChange={handleToggleChange}
                    aria-label={`Toggle ${t(field.label ?? field.id ?? field.name ?? '')}`}
                />
                <Accordion isQuiet flex isDisabled={!isGroupActive}>
                    <Disclosure isDisabled={!isGroupActive}>
                        <DisclosureTitle level={4}>
                            <Flex direction="row" alignItems="center" justifyContent="space-between" width="100%">
                                <Flex direction="row" alignItems="center" flex="1" gap="size-100">
                                    <Flex direction="column" flex="1">
                                        {field.label && (
                                            <Text UNSAFE_style={{
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                marginBottom: field.tooltip ? '4px' : '0'
                                            }}>
                                                {t(field.label)}
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>
                        </DisclosureTitle>
                        <DisclosurePanel>
                            {error && (
                                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '12px'}}>
                                    {error}
                                </Text>
                            )}
                            {FieldRendererComponent && (
                                <Flex direction="column" gap="size-200" marginTop="size-150">
                                    {field.children?.map((childField: any) => (
                                        <FieldRendererComponent
                                            key={childField.id || childField.name}
                                            field={childField}
                                            value={getGroupFieldValue(childField, groupData)}
                                            onChange={(childValue: any) => updateChildValue(childField.id || childField.name, childValue)}
                                            path={`${path || ''}.${childField.id || childField.name}`}
                                        />
                                    ))}
                                </Flex>
                            )}
                        </DisclosurePanel>
                    </Disclosure>
                </Accordion>
                {field.tooltip && (
                    <ContextualHelp variant="info" marginTop={"size-200"} onOpenChange={handleIsolationCSS}>
                        <Heading>{t('spectrum.group.help') || 'Need help?'}</Heading>
                        <Content>
                            <Text>
                                {t(field.tooltip)}
                            </Text>
                        </Content>
                    </ContextualHelp>
                )}
            </Flex>
        </View>
    );
};
