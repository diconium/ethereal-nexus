import React from 'react';
import {
  DialogField,
  FieldRenderLogic,
  FieldConfig,
  getNestedValue,
  setNestedValueMutable,
} from '@ethereal-nexus/dialog-ui-core';
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
  allValues,
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
                  setNestedValueMutable(newValue, childField.name, childValue);
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
                  setNestedValueMutable(
                    newAllValues,
                    childField.name,
                    childValue,
                  );
                  onChange(newAllValues);
                }}
                allValues={allValues}
              />
            ))}
          </div>
        );

      case 'multifield': {
        const fieldKey = field.name || field.id;
        const items = Array.isArray(value) ? value : [];
        const minItems = parseBound((field as any).min);
        const maxItems = parseBound((field as any).max);
        const canAddItem = maxItems === undefined || items.length < maxItems;
        const canRemoveItem = minItems === undefined || items.length > minItems;

        const parentValues = { ...allValues, [fieldKey]: items };

        const createNewItem = () =>
          FieldRenderLogic.createMultifieldItem(field as FieldConfig);

        const handleAddItem = () => {
          if (!canAddItem) {
            onChange(items);
            return;
          }

          onChange([...items, createNewItem()]);
        };

        const handleRemoveItem = (index: number) => {
          if (!canRemoveItem) {
            onChange(items);
            return;
          }

          onChange(FieldRenderLogic.removeMultifieldItem(items, index));
        };

        const handleMoveItem = (index: number, direction: number) => {
          const newIndex = index + direction;
          if (newIndex < 0 || newIndex >= items.length) {
            return;
          }

          const reordered = FieldRenderLogic.reorderMultifieldItems(
            items,
            index,
            newIndex,
          );
          onChange(reordered);
        };

        const handleChildChange = (
          index: number,
          childField: DialogField,
          childValue: any,
        ) => {
          const updatedItems = FieldRenderLogic.updateMultifieldItemWithField(
            items,
            index,
            childField as FieldConfig,
            childValue,
          );

          onChange(updatedItems);
        };

        return (
          <div className="space-y-3 rounded-lg border border-border/60 bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {field.label ?? fieldKey}
                </div>
                {field.tooltip && (
                  <div className="text-xs text-muted-foreground">
                    {field.tooltip}
                  </div>
                )}
                {(minItems !== undefined || maxItems !== undefined) && (
                  <div className="text-xs text-muted-foreground">
                    {formatMultifieldConstraints(minItems, maxItems)}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                disabled={!canAddItem}
              >
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm italic text-muted-foreground">
                No items yet. Click "Add Item" to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item: any, index: number) => {
                  const itemKey =
                    item &&
                    typeof item.__itemKey === 'string' &&
                    item.__itemKey.trim() !== ''
                      ? item.__itemKey
                      : FieldRenderLogic.ensureMultifieldItemKey(
                          item,
                          field as FieldConfig,
                          index,
                        );
                  return (
                    <div
                      key={itemKey}
                      className="overflow-hidden rounded-lg border border-border/70 bg-card"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2">
                        <div className="text-sm font-medium">
                          {FieldRenderLogic.getMultifieldItemLabel(
                            field as FieldConfig,
                            item,
                            index,
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveItem(index, -1)}
                            disabled={index === 0}
                          >
                            Move Up
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveItem(index, 1)}
                            disabled={index === items.length - 1}
                          >
                            Move Down
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={!canRemoveItem}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4 p-4">
                        {field.children?.map((childField) => (
                          <FieldRenderer
                            key={`${itemKey}-${childField.id || childField.name}`}
                            field={childField}
                            value={FieldRenderLogic.getMultifieldChildValue(
                              item,
                              childField as FieldConfig,
                            )}
                            onChange={(childValue) =>
                              handleChildChange(index, childField, childValue)
                            }
                            allValues={parentValues}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

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
function checkFieldCondition(
  field: DialogField,
  allValues: Record<string, any>,
): boolean {
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

function parseBound(bound?: string): number | undefined {
  if (bound === undefined) return undefined;
  const parsed = parseInt(bound, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(parsed, 0);
}

function formatMultifieldConstraints(
  minItems?: number,
  maxItems?: number,
): string {
  const parts: string[] = [];
  if (minItems !== undefined) {
    parts.push(`Min items: ${minItems}`);
  }
  if (maxItems !== undefined) {
    parts.push(`Max items: ${maxItems}`);
  }
  return parts.join(' • ');
}
