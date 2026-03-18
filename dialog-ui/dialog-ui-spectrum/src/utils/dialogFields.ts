// Utility to recursively extract field paths from dialog structure
export function extractFieldPaths(fields: any[], prefix = ''): string[] {
  let paths: string[] = [];
  fields.forEach(field => {
    const base = prefix ? `${prefix}.${field.name || field.id}` : field.name || field.id;
    if (field.children && Array.isArray(field.children)) {
      if (field.type === 'multifield') {
        paths.push(`${base}[]`);
        paths = paths.concat(extractFieldPaths(field.children, `${base}[]`));
      } else {
        paths = paths.concat(extractFieldPaths(field.children, base));
      }
    } else {
      paths.push(base);
    }
  });
  return paths;
}

// Utility to set a nested value by path (dot/bracket notation)
export function setNestedValue(obj: any, path: string, value: any) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Utility to find a field definition by path
export function findField(fields: any[], target: string): any {
  for (const f of fields) {
    if ((f.name || f.id) === target) return f;
    if (f.children) {
      const found = findField(f.children, target);
      if (found) return found;
    }
  }
  return null;
}

