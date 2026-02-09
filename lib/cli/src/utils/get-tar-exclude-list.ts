import fs from 'node:fs';

export const ignoreCommonFiles = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'node_modules',
  '.DS_Store'
]

export function getTarExcludeList(excludedPaths: string[] = []) {
  const gitignore = fs.existsSync('.gitignore')
    ? fs.readFileSync('.gitignore', 'utf-8')
    : '';
  const gitignoreFiles = gitignore
    ?.split('\n')
    ?.filter((file) => !file?.includes('#') && file?.trim() !== '');

  // Separate negation patterns from regular patterns
  const regularPatterns = gitignoreFiles.filter(pattern => !pattern.startsWith('!'));
  // Note: Negation patterns in gitignore are complex and require the full context
  // For tar exclusion, we only use non-negated patterns

  return [
    ...regularPatterns,
    ...excludedPaths,
    ...ignoreCommonFiles,
    '*.tar',
    '*.tar.gz',
    '*.tar.xz',
  ]
}
