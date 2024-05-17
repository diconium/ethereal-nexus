import { type Plugin as RollupPlugin } from 'rollup';
import * as fs from 'node:fs';
import { EtherealPluginOptions } from './types';
import { bundleSSR } from './server';
import { generateDialog } from './dialog';
import { adjustChunkImport, bundleClient, copyChunkFiles } from './client';
import { cleanTemporary, cleanWorkspace } from './utils';
import { extractExposeInto } from './options';

export default function rollupEthereal(opts: EtherealPluginOptions): RollupPlugin[] {
  const exposed = new Map<string, string>();
  let ssr = !!opts.server;
  let minify = typeof opts.server === 'object' ? opts.server.minify : false;

  return [
    {
      name: 'ethereal',
      async buildStart(_options) {
        console.log('Building ethereal bundles...');
        cleanWorkspace();
        extractExposeInto(exposed, opts, this.emitFile);
      },
      async transform(code, id) {
        this.parse

        if(!exposed.has(id)) {
          return null;
        }
        const name = exposed.get(id)!;
        const ast = this.parse(code);

        await generateDialog(code, ast, name);

        fs.mkdirSync('dist/tmp', { recursive: true });
        bundleClient(code, exposed, id, ast, name, this.emitFile);
        if (ssr) {
          await bundleSSR(code, ast, name, this.emitFile,
            {
              minify
            });
        }


        return null;
      },
      async generateBundle(_, bundle) {
        //Remove exposed component files
        for(const entry of exposed.keys()){
          delete bundle[entry.substring(1)]
        }
      },
      async writeBundle(_options, bundle) {
        copyChunkFiles(bundle);
      },
      async renderChunk(code, chunk) {
        return adjustChunkImport(chunk, code, this.parse);
      },
      buildEnd() {
        cleanTemporary();
      }
    }];
}
