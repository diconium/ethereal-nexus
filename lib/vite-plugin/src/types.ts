import { BuildOptions } from 'esbuild';

export interface EtherealPluginOptions {
  /**
   * Modules that should be exposed to the Ethereal Nexus. When provided, property name is used as public name.
   */
  exposes: ExposesObject;
  /**
   * Configuration for the server side render exported module. If no configuration exists, no server bundle will be generated.
   *
   * Server bundle is build using ESBuild, so the when using an object you can pass ESbuild options to the compiler
   */
  server?: BuildOptions | true;
  exclude?: string | RegExp | Array<string | RegExp>;
}

/**
 * Modules that should be exposed by this container. Property names are used as public paths.
 */
declare interface ExposesObject {
  [index: string]: ExposesConfig | string
}

/**
 * Advanced configuration for modules that should be exposed by this container.
 */
declare interface ExposesConfig {
  /**
   * Request to a module that should be exposed by this container.
   */
  import: string
}
