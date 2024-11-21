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

  return [
    ...gitignoreFiles,
    ...excludedPaths,
    ...ignoreCommonFiles,
    '*.tar',
    '*.tar.gz',
    '*.tar.xz',
  ]
}
