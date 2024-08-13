import { EmitFile, OutputBundle, OutputChunk, ParseAst, ProgramNode, RenderedChunk } from 'rollup';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';
import { createHash } from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config';
import { setVirtual } from '../virtual';

export function createClientCode(code: string, name: string, id: string, ast: ProgramNode) {
  let magic = new MagicString(code);
  let importsNexus = false;
  let hasSchema = false

  simple(ast, {
    VariableDeclaration(node) {
      for (const declaration of node.declarations) {
        if (declaration.id.type === 'Identifier' && declaration.id.name === 'schema' && declaration.init?.type === 'CallExpression') {
          hasSchema = true;
        }
      }
    },
    ImportDeclaration(node) {
      if (node.type === 'ImportDeclaration') {
        const { source: { value, start, end } } = node;

        if (value === '@ethereal-nexus/core') {
          const last = node.specifiers.pop();
          if (last?.type === 'ImportSpecifier') {
            magic.appendLeft(last.end, `,\n webcomponent`);
          }
          importsNexus = true;
        } else if (typeof value === 'string' && value.startsWith('.')) {
          const resolvedPath = path.join(path.dirname(id), value);
          magic.update(start + 1, end - 1, resolvedPath);
        }
      }
    },
    ExportNamedDeclaration(node) {
      if(node.declaration?.type === 'VariableDeclaration' && node.declaration){
        for(const declaration of node.declaration.declarations) {
          if(declaration.id.type === 'Identifier' && declaration.id.name === name) {
            if(!importsNexus) {
              magic.prepend(`import { webcomponent } from "@ethereal-nexus/core";\n`);
            }
            magic.append(`${name}.displayName = '${name}';\n`)
            magic.append(`webcomponent(${hasSchema ? 'schema' : ''})(${name});\n`)
          }
        }
      }
    }
  });

  return magic;
}

export function bundleClient(code: string, exposed: Map<string, string>, id: string, ast: ProgramNode, name: string, emitFile: EmitFile) {
  const clientCode = createClientCode(code, exposed.get(id)!, id, ast);
  const fileId = `.ethereal/tmp/__etherealHelper__${name}`;

  setVirtual(fileId, clientCode.toString())

  const hash = createHash('sha256')
    .update(code)
    .digest('hex')
    .slice(0, 16);

  emitFile({
    type: 'chunk',
    fileName: `.ethereal/${name}/${hash}-index.js`,
    id: fileId
  });
}

function readJSDeps(chunk: OutputChunk, bundle: OutputBundle, js = new Set<string>()) {
  if(chunk?.imports) {
    for (const jsFileName of chunk?.imports) {
      js.add(jsFileName)
    }
  }
  if(chunk.imports.length > 0) {
    for(const nestedChunk of chunk.imports) {
      readJSDeps(bundle[nestedChunk] as OutputChunk, bundle, js)
    }
  }

  return js;
}

type ViteOutputChunk = OutputChunk & {viteMetadata: {importedCss: Set<string>}}

function readCssDeps(chunk: ViteOutputChunk, bundle: OutputBundle, css = new Set<string>()) {
  if(chunk?.viteMetadata) {
    for (const cssFileName of chunk.viteMetadata.importedCss.values()) {
      css.add(cssFileName)
    }
  }
  if(chunk.imports.length > 0) {
    for(const nestedChunk of chunk.imports) {
      readCssDeps(bundle[nestedChunk] as ViteOutputChunk, bundle, css)
    }
  }

  return css;
}

export function copyChunkFiles(bundle: OutputBundle) {
  const outDir = getConfig('outDir');

  for (const chunk of Object.values(bundle)) {
    if (chunk.type === 'chunk' && chunk.facadeModuleId?.includes('__etherealHelper__')) {
      const chunkPath = path.dirname(chunk.preliminaryFileName);

      const js = readJSDeps(chunk, bundle)
      for (const imports of js.values()) {
        const importPath = path.parse(imports);
        fs.copyFileSync(`./${outDir}/${imports}`, `./${outDir}/${chunkPath}/${importPath.base}`);
      }

      //only works on vite
      if(chunk.hasOwnProperty('viteMetadata') ) {
        const cssMap = readCssDeps(chunk as ViteOutputChunk, bundle);
        for(const css of cssMap.values()) {
          const cssPath = path.parse(css)
          fs.copyFileSync(`./${outDir}/${css}`, `./${outDir}/${chunkPath}/${cssPath.base}`);
        }
      } else {
        console.warn('CSS bundling for ethereal nexus only works on vite.')
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