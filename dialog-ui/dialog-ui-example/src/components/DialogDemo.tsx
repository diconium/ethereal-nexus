import React, { useState, useEffect } from 'react';
import { DialogStructure, FieldValues, DialogField } from '@ethereal-nexus/dialog-ui-core';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FieldRenderer } from './FieldRenderer';
import { MockAEMAdapter } from '../adapters/MockAEMAdapter';
import { Typo3Adapter } from '../adapters/Typo3Adapter';
import { StrapiAdapter } from '../adapters/StrapiAdapter';

// Define the CMSAdapter interface locally since we can't import it
interface CMSAdapter {
  getDialogStructure(): Promise<DialogStructure>;
  getFieldValues(): Promise<FieldValues>;
  saveFieldValues(values: FieldValues): Promise<void>;
}

type CMSType = 'aem' | 'typo3' | 'strapi';

interface DialogDemoProps {
  cmsType?: CMSType;
}

export const DialogDemo: React.FC<DialogDemoProps> = ({ cmsType = 'aem' }) => {
  const [adapter, setAdapter] = useState<CMSAdapter | null>(null);
  const [dialogStructure, setDialogStructure] = useState<DialogStructure>([]);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize the adapter based on CMS type
  useEffect(() => {
    let newAdapter: CMSAdapter;

    switch (cmsType) {
      case 'aem':
        newAdapter = new MockAEMAdapter({
          baseUrl: 'https://author.aem.example.com',
        });
        break;
      case 'typo3':
        newAdapter = new Typo3Adapter({
          baseUrl: 'https://typo3.example.com',
          tableName: 'tt_content',
          recordUid: '123',
          fieldName: 'pi_flexform',
        });
        break;
      case 'strapi':
        newAdapter = new StrapiAdapter({
          baseUrl: 'https://strapi.example.com/api',
          contentType: 'components',
          entryId: '1',
          apiToken: 'your-api-token',
        });
        break;
    }

    setAdapter(newAdapter);
  }, [cmsType]);

  // Load dialog structure and field values
  useEffect(() => {
    if (!adapter) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load dialog structure and field values in parallel
        const [structure, values] = await Promise.all([
          adapter.getDialogStructure(),
          adapter.getFieldValues(),
        ]);

        setDialogStructure(structure);
        setFieldValues(values);

        // Set the first tab as active
        const firstTab = structure.find((field: DialogField) => field.type === 'tabs')?.children?.[0];
        if (firstTab) {
          setActiveTab(firstTab.id);
        }
      } catch (err) {
        console.error('Error loading dialog data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dialog data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [adapter]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    if (!adapter) return;

    setSaving(true);
    setError(null);

    try {
      await adapter.saveFieldValues(fieldValues);
      console.log('✅ Data saved successfully!');
    } catch (err) {
      console.error('Error saving data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const renderTabs = () => {
    const tabsField = dialogStructure.find((field: DialogField) => field.type === 'tabs');
    if (!tabsField?.children) return null;

    return (
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b">
          {tabsField.children.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-b-none"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {tabsField.children
            .filter(tab => tab.id === activeTab)
            .map((tab) => (
              <div key={tab.id} className="space-y-4">
                {tab.children?.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={getNestedValue(fieldValues, field.name)}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    allValues={fieldValues}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Dialog Demo - {cmsType.toUpperCase()} Integration
        </h2>
        <p className="text-gray-600 mb-4">
          This example demonstrates how to use dialog-ui-core with different CMS adapters.
        </p>

        {/* CMS Selector */}
        <div className="flex gap-2 mb-4">
          <Label className="text-sm font-medium">CMS Source:</Label>
          {(['aem', 'typo3', 'strapi'] as const).map((cms) => (
            <Button
              key={cms}
              variant={cmsType === cms ? 'default' : 'outline'}
              size="sm"
              disabled // Disabled for demo - would typically navigate to different story
            >
              {cms.toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Data Source Info */}
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Data Source:</strong> {' '}
          {cmsType === 'aem' && 'Web component data attributes (instant)'}
          {cmsType === 'typo3' && 'Direct API calls to Typo3 backend'}
          {cmsType === 'strapi' && 'Headless CMS API via REST'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {error}
        </div>
      )}

      {/* Dialog Content */}
      {dialogStructure.length > 0 ? (
        <>
          {renderTabs()}

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {Object.keys(fieldValues).length} fields loaded from {cmsType.toUpperCase()}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Debug Info */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show Current Values (Debug)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(fieldValues, null, 2)}
            </pre>
          </details>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No dialog structure available
        </div>
      )}
    </div>
  );
};

// Helper function to get nested values
function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
