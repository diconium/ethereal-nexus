import plugin, { type EtherealPluginOptions,  } from '@ethereal-nexus/rollup-plugin-ethereal-nexus';
import { Plugin } from 'vite';

export default function viteEthereal(opts: EtherealPluginOptions): Plugin {
  return {
    ...plugin(opts),
    apply: 'build'
  }
}
