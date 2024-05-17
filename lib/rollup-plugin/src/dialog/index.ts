import vm from 'node:vm';
import { ProgramNode } from 'rollup';
import { simple } from 'acorn-walk';
import type { Identifier, ImportSpecifier } from 'acorn';
import { saveFile } from '../utils';

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

  const schema = vm.runInNewContext(schemaCode, ctx);
  return JSON.stringify(schema, null, 2);
}

export async function generateDialog(code: string, ast: ProgramNode, name: string) {
  const schemaCode = extractDialog(ast, code);
  if (schemaCode) {
    const json = await parseDialog(schemaCode);
    saveFile(name, json);
  }
}