import vm from 'node:vm';
import { ProgramNode } from 'rollup';
import { simple } from 'acorn-walk';
import type { Identifier, ImportSpecifier } from 'acorn';
import { convertCamelCaseToDashCase, convertCamelCaseToSpaceCase, getPackageInfo, saveFile } from '../utils';

type DialogCode = string | null

export function extractDialog(ast: ProgramNode, code: string): DialogCode | null {
  let schema: DialogCode | null = null;
  let imports: string[] = [];

  // Walk through the AST to find the schema
  simple(ast, {
    ImportDeclaration(node) {
      if (node.source.type === 'Literal' && node.source.value === '@ethereal-nexus/core') {
        imports = node.specifiers
          .map(identifier => {
            return ((identifier as ImportSpecifier).imported as Identifier).name;
          });
      }
    },
    VariableDeclaration(node) {
      for (const declaration of node.declarations) {
        if (declaration.id.type === 'Identifier' && declaration.id.name === 'schema' && declaration.init?.type === 'CallExpression') {
          schema = `const { ${imports.join(', ')}, parse } = modules['@ethereal-nexus/core']
          
parse(${code.substring(declaration.init.callee.start, declaration.end)})
          `;
        }
      }
    }
  });

  return schema;
}

export async function parseDialog(schemaCode: string) {
  const ctx = vm.createContext({
    modules: {
      '@ethereal-nexus/core': await import('@ethereal-nexus/core')
    }
  });

  return vm.runInNewContext(schemaCode, ctx);
}

export async function generateManifest(code: string, ast: ProgramNode, name: string) {
  const schemaCode = extractDialog(ast, code);
  const packageJson = await getPackageInfo();

  if (schemaCode) {
    const dialog = await parseDialog(schemaCode);
    const manifest = {
      name,
      title: convertCamelCaseToSpaceCase(name),
      slug: convertCamelCaseToDashCase(name),
      version: packageJson.version,
      readme: '',
      ...dialog,
    }

    const json = JSON.stringify(manifest, undefined, 2)
    saveFile(name, json);
  }
}