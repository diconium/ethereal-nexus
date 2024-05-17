export interface EtherealPluginOptions {
  /**
   * Modules that should be exposed to the Ethereal Nexus. When provided, property name is used as public name.
   */
  exposes: ExposesObject
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
