/**
 * suggestions.ts — generate context-aware prompt suggestions from a dialog definition.
 *
 * No runtime dependencies. Works in browser and server.
 */

interface DialogField {
  type?: string;
  label?: string;
  children?: DialogField[];
  fields?: DialogField[];
}

function collectFields(node: DialogField, acc: DialogField[] = []): DialogField[] {
  const skip = new Set(["tabs", "tab", "group"]);
  if (node.type && !skip.has(node.type) && node.label) {
    acc.push(node);
  }
  for (const child of (node.children ?? node.fields ?? [])) {
    collectFields(child as DialogField, acc);
  }
  return acc;
}

export function buildSuggestions(dialogDefinition: unknown): string[] {
  const out: string[] = [];
  try {
    const allFields = collectFields(dialogDefinition as DialogField);
    const textFields  = allFields.filter((f) => ["textfield", "textarea", "richtext"].includes(f.type ?? ""));
    const multifields = allFields.filter((f) => f.type === "multifield");
    const selects     = allFields.filter((f) => f.type === "select");
    const checkboxes  = allFields.filter((f) => f.type === "checkbox");
    const media       = allFields.filter((f) => f.type === "media");

    for (const f of textFields.slice(0, 2))  out.push(`Set the "${f.label}" field`);
    for (const f of multifields.slice(0, 2)) out.push(`Add a new item to "${f.label}"`);
    for (const f of selects.slice(0, 1))     out.push(`Change the "${f.label}" selection`);
    for (const f of checkboxes.slice(0, 1))  out.push(`Toggle the "${f.label}" checkbox`);
    for (const f of media.slice(0, 1))       out.push(`Update the "${f.label}"`);

    if (out.length === 0) {
      out.push(
        "What fields are available in this dialog?",
        "Show me the current values",
        "Reset all fields to defaults",
      );
    }
  } catch { /* malformed JSON – return empty */ }
  return out.slice(0, 6);
}

