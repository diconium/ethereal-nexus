import vm from 'node:vm';
import { EmitFile, ProgramNode } from 'rollup';
import { simple } from 'acorn-walk';
import type { Identifier, ImportSpecifier } from 'acorn';
import { convertCamelCaseToDashCase, convertCamelCaseToSpaceCase, getPackageInfo } from '../utils';
import MagicString from 'magic-string';
import path from 'node:path';
import fs from 'node:fs';
import { setVirtual } from '../virtual';
import { cwd } from 'node:process';
import { getConfig } from '../config';

export function extractDialog(ast: ProgramNode, code: string, name: string, id: string, emitFile: EmitFile) {
  const magic = new MagicString(code)
  let importsNexus = false;

  // Walk through the AST to find the schema
  simple(ast, {
    ImportDeclaration(node) {
      if (node.type === 'ImportDeclaration') {
        const { source: { value, start, end } } = node;
        if (value === '@ethereal-nexus/core') {
          const last = node.specifiers.pop();
          if (last?.type === 'ImportSpecifier') {
            magic.appendLeft(last.end, `, parse`);
          }
          importsNexus = true;
        } else if (typeof value === 'string' && value.startsWith('.')) {
          const resolvedPath = path.join(path.dirname(id), value);
          magic.update(start + 1, end - 1, resolvedPath);
        }
      }
    },
  });
  if(!importsNexus) {
    magic.prepend(`import { parse } from "@ethereal-nexus/core";\n`);
  }
  magic.append(`export const __dialog = parse(schema)\n`)

  const fileId = `.ethereal/tmp/__etherealHelper__${name}__dialog.js`;
  setVirtual(fileId, magic.toString())

  emitFile({
    type: 'chunk',
    fileName: fileId,
    id: fileId,
    preserveSignature: 'strict'
  });
}

export async function parseDialog(schemaCode: string) {
  const ctx = vm.createContext({
    modules: {
      '@ethereal-nexus/core': await import('@ethereal-nexus/core')
    }
  });

  return vm.runInNewContext(schemaCode, ctx);
}

function extractReadme(id: string) {
  const componentPath = path.parse(id)
  let filePath = `${componentPath.dir}/${componentPath.name}.md`

  if(!fs.existsSync(filePath)){
    filePath = `${componentPath.dir}/README.md`
  }
  if(!fs.existsSync(filePath)){
    return '';
  }

  return fs.readFileSync(filePath, 'utf-8')
}

export async function generateManifest(name: string, id: string) {
  let dialog = { dialog: [] };
  const outDir = getConfig('outDir');

  const fileId = `${cwd()}/${outDir}/.ethereal/tmp/__etherealHelper__${name}__dialog.js`;
  const { __dialog } = await import(fileId)
  const readme = extractReadme(id);
  const packageJson = getPackageInfo();

  if (__dialog) {
    dialog = __dialog;
  }

  const manifest = {
    name,
    readme,
    title: convertCamelCaseToSpaceCase(name),
    slug: convertCamelCaseToDashCase(name),
    version: packageJson.version,
    ...dialog,
  }
  const json = JSON.stringify(manifest, undefined, 2)

  fs.writeFileSync(`./${outDir}/.ethereal/${name}/manifest.json`, json);
}