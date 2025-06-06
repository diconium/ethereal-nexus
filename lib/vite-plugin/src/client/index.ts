import { EmitFile, OutputBundle, OutputChunk, ParseAst, ProgramNode, RenderedChunk } from 'rollup';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';
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
  const fileId = `.ethereal/tmp/__etherealHelper__client__${name}`;

  setVirtual(fileId, clientCode.toString())

  emitFile({
    type: 'chunk',
    name: 'index',
    id: fileId,
  });
}

function readJSDeps(chunk: ViteOutputChunk & {key: string}, bundle: OutputBundle, js = new Set<string>()) {
  const queue = [chunk.key];
  while (queue.length > 0) {
    const chunk = queue.shift();
    const chunkData = bundle[chunk!];

    if (!chunkData || chunkData.type !== 'chunk') continue;

    for (const dep of [...chunkData.imports, ...chunkData.dynamicImports]) {
      if (!js.has(dep)) {
        js.add(dep);
        queue.push(dep);
      }
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

  const etherealChunks = Object.entries(bundle)
    .filter(([,value]) => value.type === 'chunk' && value.type === 'chunk' && value.facadeModuleId?.includes('__etherealHelper__client__'))
    .map(([key, value]) => ({
      ...value,
      key,
    })) as (ViteOutputChunk & {key: string})[]

  for (const chunk of Object.values(etherealChunks)) {
    const componentName = chunk.facadeModuleId?.split('__etherealHelper__client__').at(-1);
    const js = readJSDeps(chunk, bundle)
    for (const imports of js.values()) {
      const importPath = path.parse(imports);
      fs.copyFileSync(`./${outDir}/${imports}`, `./${outDir}/.ethereal/${componentName}/${importPath.base}`);
    }

    //only works on vite
    if(chunk.hasOwnProperty('viteMetadata') ) {
      const cssMap = readCssDeps(chunk as ViteOutputChunk, bundle);
      for(const css of cssMap.values()) {
        const cssPath = path.parse(css)
        fs.copyFileSync(`./${outDir}/${css}`, `./${outDir}/.ethereal/${componentName}/${cssPath.base}`);
      }
    } else {
      console.warn('CSS bundling for ethereal nexus only works on vite.')
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

export function moveNexusFileToFolder(bundle: OutputBundle) {
  Object.values(bundle)
    .filter(value => value.type === 'chunk' && value.facadeModuleId?.includes('.ethereal/tmp/__etherealHelper__client__'))
    .forEach(value => {
      const chunk = bundle[value.fileName];
      if (chunk.type === 'chunk' && chunk.facadeModuleId?.includes('__etherealHelper__client__')) {
        const name = chunk.facadeModuleId.split('.ethereal/tmp/__etherealHelper__client__')[1];
        chunk.fileName = `.ethereal/${name}/${chunk.fileName}`;
      }
    });
}