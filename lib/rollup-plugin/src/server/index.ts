import { EmitFile, ProgramNode } from 'rollup';
import { build, BuildOptions, Plugin as EsbuildPlugin } from 'esbuild';
import fs from 'node:fs';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';
import path from 'node:path';

const ignoreCssPlugin: EsbuildPlugin  = {
  name: 'empty-css-imports',
  setup(build) {
    build.onLoad({ filter: /\.(c|sc|sa|le)ss$/i }, () => ({ contents: '' }))
  },
}

function createServerCode(code: string, name: string, id: string, ast: ProgramNode) {
  let serverCode = new MagicString(code);
  let componentsExists = false;
  simple(ast, {
    ImportDeclaration(node) {
      if (node.type === 'ImportDeclaration') {
        const { source: { value, start, end } } = node;

        if (typeof value === 'string' && value.startsWith('.')) {
          const resolvedPath = path.join(path.dirname(id), value);
          serverCode.update(start + 1, end - 1, resolvedPath);
        }
      }
    },
    VariableDeclaration(node) {
      if(node.declarations.length ===1) {
        if(node.declarations[0].id.type === 'Identifier' && node.declarations[0].id.name === name) {
          serverCode.prepend('import { renderToString } from "react-dom/server";');
          serverCode.append(`if (ethereal?.props != void 0) {
   if(typeof getServerSideProps === 'function') {
              const data = await getServerSideProps(ethereal.props);
              ethereal.serverSideProps = { ...data.props };
            }
            const combinedProps = { ...ethereal.props, ...ethereal.serverSideProps }
  ethereal.output = renderToString(/* @__PURE__ */ jsxs(${name}, { ...combinedProps }));
}`);
          componentsExists = true
        }
      }
    }
  });
  if(!componentsExists) {
    throw new Error(`No component with the name ${name} exists in the file: ${id}`)
  }
  return serverCode;
}

export async function bundleSSR(code: string, id: string, ast: ProgramNode, name: string, emitFile: EmitFile, options: BuildOptions) {
  const serverCode = createServerCode(code,name, id, ast);
  fs.writeFileSync(`dist/tmp/__etherealHelper__server__${name}`, serverCode.toString());

  await build({
    ...options,
    entryPoints: [`dist/tmp/__etherealHelper__server__${name}`],
    format: 'esm',
    target: 'es2022',
    plugins: [
      ignoreCssPlugin,
    ],
    bundle: true,
    allowOverwrite: true,
    legalComments: 'none',
    outfile: `dist/tmp/__etherealHelper__server__${name}`
  });

  emitFile({
    type: 'chunk',
    fileName: `.ethereal/${name}/server.js`,
    id: `dist/tmp/__etherealHelper__server__${name}`
  });
}