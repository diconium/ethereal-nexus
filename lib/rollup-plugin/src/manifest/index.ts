import vm from 'node:vm';
import { ProgramNode } from 'rollup';
import { simple } from 'acorn-walk';
import type { Identifier, ImportSpecifier } from 'acorn';
import { convertCamelCaseToDashCase, convertCamelCaseToSpaceCase, getPackageInfo, saveFile } from '../utils';
import MagicString from 'magic-string';

export function extractDialog(ast: ProgramNode, code: string): string {
  let imports: string[] = [];
  let variables: Set<string> = new Set();
  const magic = new MagicString('')

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
          if(node.declarations[0].init?.type === 'CallExpression') {
            for (const argument of node.declarations[0].init.arguments) {
              if(argument.type === 'Identifier') {
                variables.add(argument.name)
              }
            }
          }

          simple(ast, {
              VariableDeclaration(node) {
                for (const declaration of node.declarations) {
                  if (declaration.id.type === 'Identifier' && variables.has(declaration.id.name)) {
                    magic.append(code.substring(declaration.start, declaration.end) + '\n')
                  }
                }
              }
            },
          )

          magic.prepend(`const { ${imports.join(', ')}, parse } = modules['@ethereal-nexus/core']\n`)
          magic.append(`parse(${code.substring(declaration.init.callee.start, declaration.end)})`)
        }
      }
    }
  });

  return magic.toString();
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
  let dialog = { dialog: [] };
  const schemaCode = extractDialog(ast, code);
  const packageJson = getPackageInfo();

  if (schemaCode) {
    dialog = await parseDialog(schemaCode);
  }

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