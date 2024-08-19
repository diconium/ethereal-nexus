import { type Plugin as RollupPlugin } from 'rollup';
import { EtherealPluginOptions } from './types';
import { bundleSSR } from './server';
import { extractDialog, generateManifest } from './manifest';
import { adjustChunkImport, bundleClient, copyChunkFiles } from './client';
import { cleanTemporary } from './utils';
import { extractExposeInto } from './options';
import { getConfig, setConfig } from './config';
import { cwd } from 'node:process';
import path from 'node:path';
import { getVirtual } from './virtual';

export default function rollupEthereal(opts: EtherealPluginOptions): RollupPlugin {
  const exposed = new Map<string, string>();
  let ssr = !!opts.server;

  return {
    name: 'ethereal:compiler',
    async buildStart(_options) {
      console.log('Building ethereal bundles...');
      if (typeof opts.server === 'object') {
        setConfig('esbuildConfig', opts.server || {});
      }

      extractExposeInto(exposed, opts, this.emitFile);
    },
    async resolveId(source) {
      if (getVirtual(source)) {
        return source;
      }
      return null;
    },
    async transform(code, id) {
      this.parse;
      if (!exposed.has(id)) {
        return null;
      }
      const name = exposed.get(id)!;
      const ast = this.parse(code);

      extractDialog(ast, code, name, id, this.emitFile);
      bundleClient(code, exposed, id, ast, name, this.emitFile);
      if (ssr) {
        await bundleSSR(code, id, ast, name, this.emitFile);
      }

      return null;
    },
    async load(id) {
      if (getVirtual(id)) {
        return getVirtual(id);
      }
      return null;
    },
    outputOptions(options) {
      const dir = path.relative(cwd(), options.dir || cwd());
      setConfig('outDir', dir);
    },
    async renderChunk(code, chunk) {
      return adjustChunkImport(chunk, code, this.parse);
    },
    async generateBundle(_, bundle) {
      //Remove exposed component files
      for (const entry of exposed.keys()) {
        delete bundle[entry.substring(1)];
      }
    },
    async writeBundle(_options, bundle) {
      copyChunkFiles(bundle);
      for (const [id, name] of exposed) {
        await generateManifest(name, id);
      }
    },
    async closeBundle() {
      cleanTemporary(getConfig('outDir'))
    }
  };
}

export type { EtherealPluginOptions };