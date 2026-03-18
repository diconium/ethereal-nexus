// Handler for chatbot message logic
import { extractFieldPaths, setNestedValue, findField } from './dialogFields';

interface HandleSendFactoryProps {
  dialog: any;
  initialValues: any;
  onUpdateValues: (values: any) => void;
  setMessages: React.Dispatch<React.SetStateAction<{ sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function handleSendFactory({ dialog, initialValues, onUpdateValues, setMessages, setLoading }: HandleSendFactoryProps) {
  return function handleSend(msg?: string) {
    // The input value should be managed in the component
    const value = typeof msg === 'string' ? msg : '';
    if (!value.trim()) return;
    setMessages((prev: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...prev, { sender: 'user', text: value }]);
    setLoading(true);
    setTimeout(() => {
      let aiSuggestions: string[] | undefined = undefined;
      if (value === '/fields') {
        const paths = dialog && dialog.fields ? extractFieldPaths(dialog.fields) : [];
        aiSuggestions = paths.map(p => `/set ${p} ...`);
        setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: `Dialog fields:\n${paths.join('\n')}`, suggestions: aiSuggestions }]);
      } else if (value.startsWith('/set ')) {
        const match = value.match(/^\/set\s+([\w.\[\]]+)(?:\s+(.+))?$/);
        if (match) {
          const [, path, v] = match;
          let fieldDef = null;
          const pathParts = path.replace(/\[(\d+)\]/g, '').split('.');
          if (dialog && dialog.fields) {
            fieldDef = findField(dialog.fields, pathParts[pathParts.length - 1]);
          }
          const defaultValue = fieldDef && fieldDef.defaultValue !== undefined ? fieldDef.defaultValue : undefined;
          if (!v || (defaultValue !== undefined && v === (Array.isArray(defaultValue) ? defaultValue.join(',') : defaultValue))) {
            setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: `Please provide a value for '${path}' that is different from the default${defaultValue !== undefined ? ` ('${defaultValue}')` : ''}.` }]);
          } else {
            let updated = { ...initialValues };
            // Checkbox handling: convert value to boolean if field type is checkbox
            let finalValue: string | boolean = v;
            if (fieldDef && fieldDef.type === 'checkbox') {
              finalValue = v === 'true';
            }
            // Special handling for cf_ fields
            if (path.startsWith('cf_')) {
              setNestedValue(updated, path, { fragmentPath: finalValue });
            } else {
              setNestedValue(updated, path, finalValue);
            }
            onUpdateValues(updated);
            aiSuggestions = ['/show', '/fields'];
            setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: `Set ${path} to "${v}".`, suggestions: aiSuggestions }]);
          }
        } else {
          setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: 'Usage: /set fieldPath value' }]);
        }
      } else if (value === '/show') {
        aiSuggestions = ['/fields'];
        setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: `Current values: \n\n\`\`\`json\n${JSON.stringify(initialValues, null, 2)}\n\`\`\`\n`, suggestions: aiSuggestions }]);
      } else if (value === '/help') {
        aiSuggestions = ['/fields', '/show', '/set fieldPath value'];
        setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: 'Try /fields, /show, or /set fieldPath value.', suggestions: aiSuggestions }]);
      } else {
        setMessages((msgs: { sender: 'ai' | 'user'; text: string; suggestions?: string[] }[]) => [...msgs, { sender: 'ai', text: 'This is a placeholder response.' }]);
      }
      setLoading(false);
    }, 700);
  };
}
