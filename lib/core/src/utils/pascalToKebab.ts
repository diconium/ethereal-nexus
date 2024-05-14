export function pascalToKebab(pascalCaseString: string) {
  return pascalCaseString
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}