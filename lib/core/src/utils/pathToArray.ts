interface PathValue {
  path: string[];
  value: any;
}

export function pathToArray(obj: Record<string, any>, parentPath: string[] = []): PathValue[] {
  const result: PathValue[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...parentPath, key];

    if (typeof value === 'object' && !value.hasOwnProperty('operator') && !Array.isArray(value)) {
      // If the value is an object, recurse into it
      result.push(...pathToArray(value, currentPath));
    } else {
      // If the value is not an object, store the path and value
      result.push({ path: currentPath, value });
    }
  }

  return result;
}