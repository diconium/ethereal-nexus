import React from 'react';
import { TextField as SpectrumTextField } from '@adobe/react-spectrum';
import {FieldProps} from "@ethereal-nexus/dialog-ui-core";

export const TextField: React.FC<FieldProps> = ({ field, value, onChange, error }) => {
  const { label, placeholder, required, tooltip, min, max } = field;

  return (
    <SpectrumTextField
      label={label}
      value={value || ''}
      placeholder={placeholder}
      isRequired={required}
      validationState={error ? 'invalid' : 'valid'}
      errorMessage={error}
      description={tooltip || undefined}
      minLength={min ? parseInt(min, 10) : undefined}
      maxLength={max ? parseInt(max, 10) : undefined}
      onChange={onChange}
    />
  );
};
