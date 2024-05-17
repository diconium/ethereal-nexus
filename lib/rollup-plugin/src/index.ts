import { type Plugin as RollupPlugin, type ProgramNode } from 'rollup';
import path from 'node:path';
import * as fs from 'node:fs';
import { type Identifier, type ImportSpecifier } from 'acorn';
import { simple } from 'acorn-walk';
import * as vm from 'node:vm';
import MagicString from 'magic-string';
import { build } from 'esbuild';
import { EtherealPluginOptions } from './types';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
type DialogCode = string | null

function extractDialog(ast: ProgramNode, code: string): DialogCode | null {
  let schema: DialogCode | null = null;
  let imports: string[] = [];
  // Parse the source code

  // Walk through the AST to find the schema
  simple(ast, {
    ImportDeclaration(node) {
      if (node.source.type === 'Literal' && node.source.value === '@ethereal-nexus/core') {
        imports = node.specifiers
          .map(identifier => {
            return ((identifier as ImportSpecifier).imported as Identifier).name;
          })
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

async function parseDialog(schemaCode: string) {
  const ctx = vm.createContext({
    modules: {
      '@ethereal-nexus/core': await import('@ethereal-nexus/core')
    }
  });

  const schema = vm.runInNewContext(schemaCode, ctx);
  return JSON.stringify(schema, null, 2);
}

function saveFile(name: string, json: string) {

  fs.mkdirSync(`dist/.ethereal/${name}`, { recursive: true });
  const outputFilePath = path.join(`dist/.ethereal/${name}`, `manifest.json`);

  // Write JSON to file
  fs.writeFileSync(outputFilePath, json);
}

export default function rollupEthereal(opts: EtherealPluginOptions): RollupPlugin[] {
  return [
    {
      name: 'ethereal',
      async buildStart() {
        console.log('Building ethereal bundles...');
        fs.rmSync('./dist/.ethereal', { recursive: true, force: true });
        for(const component of Object.values(opts.exposes))  {
          if(typeof component === 'string') {
            this.emitFile({
              type: 'chunk',
              fileName: path.resolve(component).substring(1),
              id: path.resolve(component),
            })
          }
        }
      },
      async transform(code, id) {
        // Check if the file imports ethereal nexus
        if (!code.includes('@ethereal-nexus/core') || id.includes('__etherealHelper__')) {
          return null;
        }
        console.log(id)
        const name = id.split('/').pop()!.split('.')[0];
        const ast = this.parse(code);

        const schemaCode = extractDialog(ast, code);
        if (schemaCode) {
          const json = await parseDialog(schemaCode);
          saveFile(name, json);
        }

        let serverCode = new MagicString(code);
        simple(ast, {
          CallExpression(node) {
            if (node.callee.type === 'CallExpression' && node.callee.callee.type == 'Identifier' && node.callee.callee.name === 'webcomponent') {
              if (node.arguments[0].type === 'Identifier') {
                serverCode.prepend('import { renderToString } from "react-dom/server";')
                serverCode.append(`if (ethereal?.props != void 0) {
  const data = await getServerSideProps(ethereal.props);
  ethereal.serverSideProps = { ...data.props };
  ethereal.output = renderToString(/* @__PURE__ */ jsxs(${node.arguments[0].name}, { ...{...ethereal.props, ...ethereal.serverSideProps} }));
}`);
                serverCode.remove(node.start, node.end);
                const nextChar = code[node.end];
                if (nextChar === '\n') {
                  // If there's a new line character, delete it
                  serverCode.remove(node.end, node.end + 1);
                }
             }
            }
          },
        });

        fs.mkdirSync('dist/tmp', { recursive: true });
        fs.writeFileSync(`dist/tmp/__etherealHelper__${name}`, code);
        fs.writeFileSync(`dist/tmp/__etherealHelper__server__${name}`, serverCode.toString());

        this.emitFile({
          type: 'chunk',
          fileName: `.ethereal/${name}/index.js`,
          id: `dist/tmp/__etherealHelper__${name}`
        });

        await build({
          entryPoints: [`dist/tmp/__etherealHelper__server__${name}`],
          format: 'esm',
          target: 'es2022',
          bundle: true,
          allowOverwrite: true,
          minify: true,
          legalComments: 'none',
          outfile: `dist/tmp/__etherealHelper__server__${name}`,
        })

        this.emitFile({
          type: 'chunk',
          fileName: `.ethereal/${name}/server.js`,
          id: `dist/tmp/__etherealHelper__server__${name}`,
        });

        return null;
      },
      async writeBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.facadeModuleId?.includes('__etherealHelper__')) {
            for (const imports of chunk.imports) {
              const importPath = path.parse(imports);
              const chunkPath = path.dirname(chunk.preliminaryFileName);

              fs.copyFileSync(`./dist/${imports}`, `./dist/${chunkPath}/${importPath.base}`);
            }
          }
        }
      },
      async renderChunk(code, chunk) {
        if(chunk.facadeModuleId?.includes('__etherealHelper__')){
          const ast = this.parse(code);
          const magic = new MagicString(code);

          simple(ast, {
            ImportDeclaration(node){
              const { value, start, end } = node.source;
              if(value && typeof value === 'string'){
                magic.update(start + 1, end - 1, `./${value.split('/').pop()}`)
              }
            }
          })

          return magic.toString()
        }

        return null;
      },
      buildEnd() {
        fs.rmSync('./dist/tmp', { force: true, recursive: true });
      }
    }];
}
