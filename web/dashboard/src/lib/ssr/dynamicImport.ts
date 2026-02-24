import vm from 'vm';
import { builtinModules } from 'module';
import { LRUCache } from '@/lib/cache/LRUCache';

const cache = new LRUCache<string, any>(100); // Set the cache capacity to 100

/**
 * @param {string} url - URL of a source code file.
 * @param {vm.Context} sandbox - Optional execution context.
 * @param {ImportMap} importMap Optional Path to import_map.json file or object.
 * @returns {Promise<any>} Result of the evaluated code.
 */
// @ts-ignore
export default async function dynamicImport(
  specifier,
  sandbox = {},
  { imports = {} } = { imports: {} },
) {
  console.time('dynamicImport-url');
  const url =
    specifier in imports ? new URL(imports[specifier]) : new URL(specifier);
  console.timeEnd('dynamicImport-url');

  console.time('dynamicImport-createContext');
  const context = vm.createContext({ ...sandbox });
  console.timeEnd('dynamicImport-createContext');

  const mod = await createModuleFromURL(url, context);

  console.time('dynamicImport-linker');
  const linker = await linkWithImportMap({ imports });
  console.timeEnd('dynamicImport-linker');

  console.time('dynamicImport-link');
  await mod.link(linker);
  console.timeEnd('dynamicImport-link');
  // Execute any imperative statements in the module's code.
  await mod.evaluate();
  // The namespace includes the exports of the ES module.
  return mod.namespace;
}

/**
 * @param {string} url - URL of a source code file.
 * @returns {Promise<string>} Raw source code.
 */
// @ts-ignore

async function fetchCode(url: string) {
  const cached = cache.get(url);
  if (typeof cached === 'string') {
    console.debug('Using cached fetch for', url);
    return cached;
  }
  if (cached) {
    console.debug('Using in-progress fetch for', url);
    // In-progress promise
    return cached;
  }
  // Start fetch and cache the promise immediately
  const fetchPromise = (async () => {
    console.time('fetch server.js');
    const response = await fetch(url);
    console.timeEnd('fetch server.js');
    if (response.ok) {
      const text = await response.text();
      cache.set(url, text); // Store final result
      return text;
    } else {
      cache.delete(url); // Remove failed promise
      console.error(
        'Failed to fetch',
        url,
        response.status,
        response.statusText,
      );
      throw new Error(`Error fetching ${url}: ${response.statusText}`);
    }
  })();
  cache.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * @param {URL} url
 * @param {vm.Context} context
 * @returns {Promise<vm.Module>}
 */
// @ts-ignore
async function createModuleFromURL(url, context) {
  const identifier = url.toString();

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    // Download the code (naive implementation!)
    const source = await fetchCode(identifier);

    // Instantiate a ES module from raw source code.
    return new vm.SourceTextModule(source, {
      identifier,
      context,
    });
  } else if (url.protocol === 'node:') {
    const imported = await import(identifier);
    const exportNames = Object.keys(imported);

    return new vm.SyntheticModule(
      exportNames,
      function () {
        for (const name of exportNames) {
          this.setExport(name, imported[name]);
        }
      },
      { identifier, context },
    );
  } else {
    // Other possible schemes could be file: and data:
    // See https://nodejs.org/api/esm.html#esm_urls
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
}

/**
 * @typedef {object} ImportMap
 * @property {NodeJS.Dict<string>} imports
 *
 * @param {ImportMap} importMap Import map object.
 * @returns Link function.
 */
// @ts-ignore
async function linkWithImportMap({ imports }) {
  /**
   * @param {string} specifier
   * @param {vm.SourceTextModule} referencingModule
   * @returns {Promise<vm.SourceTextModule>}
   */
  // @ts-ignore
  return async function link(specifier, referencingModule) {
    let url;
    if (builtinModules.includes(specifier)) {
      // If the specifier is a bare module specifier for a Node.js builtin,
      // a valid "node:" protocol URL is created for it.
      url = new URL('node:' + specifier);
    } else {
      // @ts-ignore
      if (url in imports) {
        // If the specifier is contained in the import map, it is used from there.
        url = new URL(imports[specifier]);
      } else {
        // If the specifier is a bare module specifier, but not contained
        // in the import map, it will be resolved against the parent
        // identifier. E.g., "foo" and "https://cdn.skypack.dev/bar" will
        // resolve to "https://cdn.skypack.dev/foo". Relative specifiers
        // will also be resolved against the parent, as expected.
        url = new URL(specifier, referencingModule.identifier);
      }
    }
    return createModuleFromURL(url, referencingModule.context);
  };
}
