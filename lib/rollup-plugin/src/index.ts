import { type Plugin as RollupPlugin } from 'rollup';
import path from 'node:path';
import * as fs from 'node:fs';
import { type Identifier, type ImportSpecifier, parse, type Program } from 'acorn';
import { simple } from 'acorn-walk';
import * as vm from 'node:vm';

type DialogCode = string | null
type FilePath = string

export interface Options {
  exclude?: string | RegExp | Array<string | RegExp>;
}

const whitelist = [
  'dialog',
  'text'
];

function extractDialog(ast: Program, code: string): DialogCode | null {
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
          .filter(name => whitelist.includes(name));
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

export default function rollupEthereal(opts: Options = {}): RollupPlugin {
  return {
    name: 'ethereal',

    async buildStart() {
      console.log('Building ethereal bundles...');
      fs.rmSync('./dist/.ethereal', {recursive: true, force: true})
    },
    async transform(code, id) {
      // Check if the file imports ethereal nexus
      if (!code.includes('@ethereal-nexus/core') || id.includes('__etherealHelper__')) {
        return null;
      }
      const name = id.split('/').pop()!.split('.')[0];
      const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });

      const schemaCode = extractDialog(ast, code);
      if (schemaCode) {
        const json = await parseDialog(schemaCode);
        saveFile(name, json);
      }

      let serverCode = ''

      simple(ast, {
        CallExpression(node) {
          if(node.callee.type === 'Identifier' && node.callee.name === 'webcomponent'){
            if(node.arguments[1].type === 'Identifier'){
              serverCode = `import { renderToString } from "react-dom/server";
${code.substring(0, node.start) + code.substring(node.end + 2, code.length)}
if (typeof global !== "undefined" && global.props != void 0) {
  global.output = renderToString(/* @__PURE__ */ jsx(${node.arguments[1].name}, { ...global.props }));
}`
            }

          }
        }
      });

      fs.mkdirSync('dist/tmp', { recursive: true });
      fs.writeFileSync(`dist/tmp/__etherealHelper__${name}`, code);
      fs.writeFileSync(`dist/tmp/__etherealHelper__server__${name}`, serverCode);

      this.emitFile({
        type: 'chunk',
        fileName: `.ethereal/${name}/index.js`,
        id: `dist/tmp/__etherealHelper__${name}`,
      });

      this.emitFile({
        type: 'chunk',
        fileName: `.ethereal/${name}/server.js`,
        id: `dist/tmp/__etherealHelper__server__${name}`,
      });

      return null;
    },
    async writeBundle(_options, bundle) {
      for(const chunk of Object.values(bundle)) {
        if(chunk.type === 'chunk' && chunk.facadeModuleId?.includes('__etherealHelper__')){
          for(const imports of chunk.imports){
            fs.copyFileSync(`./dist/${imports}`, `./dist/${path.dirname(chunk.preliminaryFileName)}/${imports}`)
          }
        }
      }
    },
    buildEnd() {
      fs.rmSync('./dist/tmp', {recursive: true})
    }
  };
}
