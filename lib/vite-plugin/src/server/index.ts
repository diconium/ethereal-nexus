import { EmitFile, ProgramNode } from 'rollup';
import { build, Plugin as EsbuildPlugin } from 'esbuild';
import fs from 'node:fs';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';
import path from 'node:path';
import { getConfig } from '../config';
import svgr from 'esbuild-plugin-svgr'
import { createHash } from 'node:crypto';

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
  ethereal.output = renderToString(/* @__PURE__ */ jsx(${name}, { ...combinedProps }));
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

export async function bundleSSR(code: string, id: string, ast: ProgramNode, name: string, emitFile: EmitFile) {
  const options = getConfig('esbuildConfig');

  if (!fs.existsSync(`./.ethereal/tmp`)) {
    fs.mkdirSync(`./.ethereal/tmp`, {recursive: true});
  }
  const serverCode = createServerCode(code,name, id, ast);
  fs.writeFileSync(`.ethereal/tmp/__etherealHelper__server__${name}`, serverCode.toString());

  const result = await build({
    ...options,
    entryPoints: [`.ethereal/tmp/__etherealHelper__server__${name}`],
    format: 'esm',
    target: 'es2022',
    plugins: [
      svgr(),
      ignoreCssPlugin,
      ...options.plugins ? options.plugins : [],
    ],
    bundle: true,
    allowOverwrite: true,
    legalComments: 'none',
    write: false, // Do not write to disk
  });

  const hash = createHash('sha256')
    .update(code)
    .digest('hex')
    .slice(0, 16);


  emitFile({
    type: 'prebuilt-chunk',
    fileName: `.ethereal/${name}/${hash}-server.js`,
    code: result.outputFiles[0].text
  });
}
