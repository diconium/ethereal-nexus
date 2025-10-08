import React from 'react';
import {DatePicker, View} from '@adobe/react-spectrum';
import {parseDate} from '@internationalized/date';
import {handleIsolationCSS} from './popoverUtils';
import {FieldConfig} from "@ethereal-nexus/dialog-ui-core";
import {useI18n} from '../providers';

interface SpectrumCalendarFieldProps {
    field: FieldConfig;
    value?: string;
    onChange: (value: string) => void;
    error?: string | null | undefined
}

export const SpectrumCalendarField: React.FC<SpectrumCalendarFieldProps> = ({field, value, onChange, error}) => {
    const {t} = useI18n();

    // Helper function to parse date strings safely
    const parseDateString = (dateString: string) => {
        try {
            if (!dateString) return null;
            // Handle different date formats that might come from AEM
            // Support ISO date format (YYYY-MM-DD) and full ISO datetime
            const dateOnly = dateString.split('T')[0]; // Extract date part if datetime
            return parseDate(dateOnly);
        } catch (e) {
            console.warn('Failed to parse date:', dateString, e);
            return null;
        }
    };

    // Convert value to date object if it's a string
    const dateValue = value ? parseDateString(value) : null;

    // Handle date change - convert back to string format
    const handleDateChange = (newDate: any) => {
        if (newDate) {
            // Convert to ISO date string (YYYY-MM-DD)
            const isoString = newDate.toString();
            onChange(isoString);
        } else {
            onChange('');
        }
    };

    return (
        <View
            position="relative"
            UNSAFE_style={{
                zIndex: 9999,
                position: 'relative',
            }}
        >
            <DatePicker
                onOpenChange={handleIsolationCSS}
                label={t(field.label ?? '')}
                value={dateValue}
                onChange={handleDateChange}
                isRequired={field.required}
                validationState={error ? 'invalid' : 'valid'}
                errorMessage={error || undefined}
                description={t(field.tooltip ?? '') || undefined}
                width="100%"
                minValue={field.min ? parseDateString(field.min) : undefined}
                maxValue={field.max ? parseDateString(field.max) : undefined}
            />
        </View>
    );
};
