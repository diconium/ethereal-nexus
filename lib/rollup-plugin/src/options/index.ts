import { EtherealPluginOptions } from '../types';
import { EmitFile } from 'rollup';
import path from 'node:path';

export function extractExposeInto(exposed: Map<string, string>, opts: EtherealPluginOptions, emitFile: EmitFile) {
  for (const [name, component] of Object.entries(opts.exposes)) {
    if (typeof component === 'string') {
      const id = path.resolve(component);

      exposed.set(id, name);
      emitFile({
        type: 'chunk',
        fileName: path.resolve(component).substring(1),
        id
      });
    }
  }
}