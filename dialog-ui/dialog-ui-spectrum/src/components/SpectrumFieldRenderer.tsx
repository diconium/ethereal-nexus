import React from 'react';
import {
  TextField,
  Checkbox,
  Switch,
  Text,
  View,
  Flex,
} from "@adobe/react-spectrum";
import {
  BaseFieldRenderer,
  FieldRendererProps,
  MultifieldRendererProps
} from '@ethereal-nexus/dialog-ui-core';
import {SpectrumMediaField} from './SpectrumMediaField';
import {SpectrumPathbrowserField} from './SpectrumPathbrowserField';
import {SpectrumDatamodelField} from "./SpectrumDatamodelField";
import {SpectrumGroupField} from "./SpectrumGroupField";
import {SpectrumCalendarField} from "./SpectrumCalendarField";
import SpectrumFieldTabs from './SpectrumFieldTabs';
import SpectrumMultifieldRenderer from './SpectrumMultifieldRenderer';
import SpectrumPickerField from "./SpectrumPickerField";
import {SpectrumRichTextEditorField} from "./SpectrumRichTextEditorField";
import {SpectrumDataSourceField} from "./SpectrumDataSourceField";
import {useI18n} from '../providers';
import {SpectrumNavigation} from "@/components/SpectrumNavigation.tsx";
import {getFieldName} from "@/components/getFieldName.ts";
import {evaluateConditions} from "@/utils/conditions.ts";
import { useFormDataContext } from '@/components/FormDataContext.tsx';

const useFieldI18n = () => {
  const {t} = useI18n();

  const getFieldLabel = (field: any) => field.label ? t(field.label) : '';
  const getFieldTooltip = (field: any) => field.tooltip ? t(field.tooltip) : '';

  return {t, getFieldLabel, getFieldTooltip};
};

// Spectrum-specific field renderer implementation
export class SpectrumFieldRenderer extends BaseFieldRenderer<React.ReactElement> {

  private i18nHelpers: any;

  constructor(i18nHelpers: any) {
    super();
    this.i18nHelpers = i18nHelpers;
  }

  renderTextField(props: FieldRendererProps): React.ReactElement {
    const {field, value, onChange, error} = props;
    const {getFieldLabel, getFieldTooltip} = this.i18nHelpers;

    return (
      <Flex direction="row" alignItems="start" gap="size-100">
        <TextField
          label={getFieldLabel(field)}
          value={value || ''}
          onChange={onChange}
          isRequired={field.required}
          validationState={error ? 'invalid' : 'valid'}
          errorMessage={error || undefined}
          description={getFieldTooltip(field) || undefined}
          width="100%"
        />
      </Flex>
    );
  }

  renderSelect(props: FieldRendererProps): React.ReactElement {
    return <SpectrumPickerField {...props}></SpectrumPickerField>;
  }

  renderCheckbox(props: FieldRendererProps): React.ReactElement {
    const {field, value, onChange, error} = props;
    const {getFieldLabel} = this.i18nHelpers;

    return (
      <Checkbox
        isSelected={!!value}
        onChange={onChange}
        isInvalid={!!error}
      >
        {getFieldLabel(field)}
      </Checkbox>
    );
  }

  renderSwitch(props: FieldRendererProps): React.ReactElement {
    const {field, value, onChange} = props;
    const {getFieldLabel} = this.i18nHelpers;

    return (
      <Switch
        isSelected={!!value}
        onChange={onChange}
      >
        {getFieldLabel(field)}
      </Switch>
    );
  }

  renderTab(props: FieldRendererProps): React.ReactElement {
    const {field, value, onChange, path, page} = props;
    const {getFieldTooltip} = this.i18nHelpers;

    console.log(`🎨 [SpectrumFieldRenderer] TAB renderTab called:`, {
      fieldId: getFieldName(field),
      fieldLabel: field.label,
      value: value,
      hasChildren: !!field.children,
      childrenCount: field.children?.length || 0,
      path: path
    });

    // Tab should not manage its own value - it should pass the original value through
    // to its children since tabs are just UI containers, not data containers

    return (
      <View>
        {field.tooltip && (
          <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '12px'}}>
            {getFieldTooltip(field)}
          </Text>
        )}
        <Flex direction="column" gap="size-100">
          {field.children?.map((childField: any) => (
            <SpectrumFieldRendererComponent
              key={getFieldName(childField)}
              field={childField}
              value={value?.[getFieldName(childField)]}
              onChange={childValue => {
                onChange({...value, [getFieldName(childField)]: childValue});
              }}
              path={path}
              page={page}
            />
          ))}
        </Flex>
      </View>
    );
  }

  renderGroup(props: FieldRendererProps): React.ReactElement {
    return <SpectrumGroupField {...props} FieldRendererComponent={SpectrumFieldRendererComponent}/>;
  }

  renderUnsupportedField(fieldType: string): React.ReactElement {
    return (
      <Text>Unsupported field type: {fieldType}</Text>
    );
  }

  renderCalendar(props: FieldRendererProps): React.ReactElement {
    return <SpectrumCalendarField {...props}/>;
  }

  renderMedia(props: FieldRendererProps): React.ReactElement {
    return <SpectrumMediaField {...props} />;
  }

  renderPathbrowser(props: FieldRendererProps): React.ReactElement {
    return <SpectrumPathbrowserField {...props} />;
  }

  renderDatamodel(props: FieldRendererProps): React.ReactElement {
    return <SpectrumDatamodelField {...props} />;
  }

  // Implement renderMultifield to satisfy abstract class
  renderMultifield(props: MultifieldRendererProps): React.ReactElement {
    // Ensure path is always a string
    const safeProps = {
      ...props,
      path: props.path ?? ''
    };

    return <SpectrumMultifieldRenderer {...safeProps} />;
  }

  // Override the render method from BaseFieldRenderer
  render(props: FieldRendererProps): React.ReactElement {
    const {field} = props;

    switch (field.type) {
      case 'textfield':
        return this.renderTextField(props);
      case 'select':
      case 'picker':
        return this.renderSelect(props);
      case 'checkbox':
        return this.renderCheckbox(props);
      case 'switch':
        return this.renderSwitch(props);
      case 'multifield':
        return this.renderMultifield({
          ...props,
          path: props.path ?? ''
        });
      case 'tabs':
        return <SpectrumFieldTabs {...props} />;
      case 'tab':
        return this.renderTab(props);
      case 'group':
        return this.renderGroup(props);
      case 'calendar':
        return this.renderCalendar(props);
      case 'media':
      case 'image':
        return this.renderMedia(props);
      case 'pathbrowser':
        return this.renderPathbrowser(props);
      case 'datamodel':
        return this.renderDatamodel(props);
      case 'dynamic':
        return <></>; // Return empty fragment to ensure no HTML component is rendered for dynamic fields
      case 'richtexteditor':
        return <SpectrumRichTextEditorField {...props} />;
      case 'datasource':
        return <SpectrumDataSourceField {...props} />;
      case "navigation": {
        return <SpectrumNavigation {...props} />;
      }
      default:
        return this.renderUnsupportedField(field.type);
    }
  }
}

// React component wrapper for the Spectrum field renderer
export const SpectrumFieldRendererComponent: React.FC<FieldRendererProps> = (props) => {
  const i18nHelpers = useFieldI18n();
  const { formData } = useFormDataContext();
  const renderer = new SpectrumFieldRenderer(i18nHelpers);

  const { field, path } = props;

  if (!evaluateConditions(field, formData, path)) {
    console.debug(`🎨 [SpectrumFieldRenderer] Field hidden by conditions:`, {
      fieldId: field.id,
      fieldLabel: field.label,
    })
    return <></>;
  }

  // Always pass the latest formData from context
  const component = renderer.render(props);
  return (
    <View>
      {component}
    </View>
  );
};

export type {FieldRendererProps};
