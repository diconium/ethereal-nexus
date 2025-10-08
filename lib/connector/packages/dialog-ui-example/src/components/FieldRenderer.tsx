import React from 'react';
import { DialogField } from '@ethereal-nexus/dialog-ui-core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldRendererProps {
  field: DialogField;
  value: any;
  onChange: (value: any) => void;
  allValues: Record<string, any>;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  allValues
}) => {
  // Check field conditions
  const isVisible = checkFieldCondition(field, allValues);

  if (!isVisible) {
    return null;
  }

  const renderField = () => {
    switch (field.type) {
      case 'textfield':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.tooltip && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ℹ️ {field.tooltip}
                </span>
              )}
            </Label>
            <Input
              id={field.id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'pathbrowser':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.tooltip && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ℹ️ {field.tooltip}
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id={field.id}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder}
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                Browse
              </Button>
            </div>
          </div>
        );

      case 'select':
        const fieldValues = (field as any).values || [];
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.tooltip && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ℹ️ {field.tooltip}
                </span>
              )}
            </Label>
            <Select value={value || ''} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {fieldValues.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'group':
        return (
          <div className="space-y-4 p-4 border rounded-md">
            <div className="font-medium">
              {field.label}
              {field.tooltip && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ℹ️ {field.tooltip}
                </span>
              )}
            </div>
            {field.children?.map((childField) => (
              <FieldRenderer
                key={childField.id}
                field={childField}
                value={getNestedValue(value, childField.name)}
                onChange={(childValue) => {
                  const newValue = { ...value };
                  setNestedValue(newValue, childField.name, childValue);
                  onChange(newValue);
                }}
                allValues={allValues}
              />
            ))}
          </div>
        );

      case 'tab':
        return (
          <div className="space-y-4">
            {field.children?.map((childField) => (
              <FieldRenderer
                key={childField.id}
                field={childField}
                value={getNestedValue(allValues, childField.name)}
                onChange={(childValue) => {
                  // Update the parent onChange with the field name and value
                  const newAllValues = { ...allValues };
                  setNestedValue(newAllValues, childField.name, childValue);
                  onChange(newAllValues);
                }}
                allValues={allValues}
              />
            ))}
          </div>
        );

      default:
        return (
          <div className="p-2 bg-gray-100 rounded text-sm">
            Unsupported field type: {field.type}
          </div>
        );
    }
  };

  return renderField();
};

// Helper function to check field conditions
function checkFieldCondition(field: DialogField, allValues: Record<string, any>): boolean {
  const condition = (field as any).condition;

  if (!condition) {
    return true;
  }

  const fieldValue = getNestedValue(allValues, condition.field);

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value;
    case 'ne':
      return fieldValue !== condition.value;
    case 'empty':
      return !fieldValue;
    case 'not-empty':
      return !!fieldValue;
    default:
      return true;
  }
}

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper function to set nested values
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
