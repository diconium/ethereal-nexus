import { EmitFile, ProgramNode } from 'rollup';
import { build, BuildOptions } from 'esbuild';
import fs from 'node:fs';
import MagicString from 'magic-string';
import { simple } from 'acorn-walk';

function createServerCode(code: string, ast: ProgramNode) {
  let serverCode = new MagicString(code);
  simple(ast, {
    CallExpression(node) {
      if (node.callee.type === 'CallExpression' && node.callee.callee.type == 'Identifier' && node.callee.callee.name === 'webcomponent') {
        if (node.arguments[0].type === 'Identifier') {
          serverCode.prepend('import { renderToString } from "react-dom/server";');
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
    }
  });
  return serverCode;
}

export async function bundleSSR(code: string, ast: ProgramNode, name: string, emitFile: EmitFile, options: BuildOptions) {
  const serverCode = createServerCode(code, ast);
  fs.writeFileSync(`dist/tmp/__etherealHelper__server__${name}`, serverCode.toString());
  await build({
    ...options,
    entryPoints: [`dist/tmp/__etherealHelper__server__${name}`],
    format: 'esm',
    target: 'es2022',
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