import { EmitFile, OutputBundle, ParseAst, ProgramNode, RenderedChunk } from 'rollup';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';
import fs from 'node:fs';
import path from 'node:path';

export function createClientCode(code: string, name: string, ast: ProgramNode) {
  let magic = new MagicString(code);
  simple(ast, {
    ImportDeclaration(node){
      if(node.type==='ImportDeclaration' && node.source.value === '@ethereal-nexus/core'){
        const last = node.specifiers.pop();
        if(last?.type === 'ImportSpecifier') {
          magic.appendLeft(last.end, `,\n webcomponent`)
        }
      }
    },
    ExportNamedDeclaration(node) {
      if(node.declaration?.type === 'VariableDeclaration' && node.declaration){
        for(const declaration of node.declaration.declarations) {
          if(declaration.id.type === 'Identifier' && declaration.id.name === name) {
            magic.append(`${name}.displayName = '${name}';\n`)
            magic.append(`webcomponent(schema)(${name});\n`)
          }
        }
      }
    }
  });

  return magic;
}

export function bundleClient(code: string, exposed: Map<string, string>, id: string, ast: ProgramNode, name: string, emitFile: EmitFile) {
  const clientCode = createClientCode(code, exposed.get(id)!, ast);
  fs.writeFileSync(`dist/tmp/__etherealHelper__${name}`, clientCode.toString());

  emitFile({
    type: 'chunk',
    fileName: `.ethereal/${name}/index.js`,
    id: `dist/tmp/__etherealHelper__${name}`
  });
}

export function copyChunkFiles(bundle: OutputBundle) {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === 'chunk' && chunk.facadeModuleId?.includes('__etherealHelper__')) {
      for (const imports of chunk.imports) {
        const importPath = path.parse(imports);
        const chunkPath = path.dirname(chunk.preliminaryFileName);

        fs.copyFileSync(`./dist/${imports}`, `./dist/${chunkPath}/${importPath.base}`);
      }
    }
  }
}

export function adjustChunkImport(chunk: RenderedChunk, code: string, parse: ParseAst) {
  if (chunk.facadeModuleId?.includes('__etherealHelper__')) {
    const ast = parse(code);
    const magic = new MagicString(code);

    simple(ast, {
      ImportDeclaration(node) {
        const { value, start, end } = node.source;
        if (value && typeof value === 'string') {
          magic.update(start + 1, end - 1, `./${value.split('/').pop()}`);
        }
      }
    });

    return magic.toString();
  }

  return null;
}