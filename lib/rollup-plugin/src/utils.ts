import fs from 'node:fs';
import path from 'node:path';

export function saveFile(name: string, json: string) {
  fs.mkdirSync(`dist/.ethereal/${name}`, { recursive: true });
  const outputFilePath = path.join(`dist/.ethereal/${name}`, `manifest.json`);

  // Write JSON to file
  fs.writeFileSync(outputFilePath, json);
}

export function cleanTemporary() {
  fs.rmSync('./dist/tmp', { force: true, recursive: true });
}

export function cleanWorkspace() {
  fs.rmSync('./dist/.ethereal', { recursive: true, force: true });
}