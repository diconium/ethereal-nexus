import fs from "fs-extra"
import { type PackageJson } from "type-fest"
import { join } from 'node:path';
import { cwd } from 'node:process';

export function cleanTemporary() {
  fs.rmSync(`./.ethereal`, { force: true, recursive: true });
}

export function convertCamelCaseToSpaceCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

export function convertCamelCaseToDashCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function getPackageInfo() {
  const packageJsonPath = join(cwd(), "package.json")

  return fs.readJSONSync(packageJsonPath) as PackageJson
}