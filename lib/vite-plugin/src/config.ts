import { BuildOptions } from 'esbuild';

type Config = {
  outDir: string;
  esbuildConfig: BuildOptions
}

let state = {
  outDir: 'dist',
  esbuildConfig: {},
};

export function setConfig<T extends keyof Config>(key: T, value: Config[T]) {
  state[key] = value;
}

export function getConfig<T extends keyof Config>(key: T): Config[T] {
  return state[key];
}