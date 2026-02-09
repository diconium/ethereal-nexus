import dynamicImport from "./dynamicImport";
import {TextEncoder} from "util";
import { logger } from "../logger";

export async function callSSR(componentType, componentProps = {}, assets) {

    const jsAsset = assets.filter(asset => asset.type === "server");

    if (jsAsset.length === 0) {
        logger.warn('No server-side assets found for SSR rendering', {
            operation: 'ssr-render',
            componentType,
            totalAssets: assets.length,
            propsKeys: Object.keys(componentProps),
        });
        return {output: "", serverSideProps: undefined};
    }

    logger.debug('Starting SSR render process', {
        operation: 'ssr-render',
        componentType,
        assetPath: jsAsset[0].filePath,
        propsKeys: Object.keys(componentProps),
        propsCount: Object.keys(componentProps).length,
    });

    const startTime = Date.now();

    try {
        const sandbox =
            {
                ...global,
                console: console,
                TextEncoder: TextEncoder,
                fetch: fetch,
                ethereal: {
                    props: {...componentProps},
                }
            }

        await dynamicImport(jsAsset[0].filePath, sandbox);

        const renderTime = Date.now() - startTime;

        const hasServerSideProps = !!sandbox?.ethereal?.serverSideProps;
        const hasOutput = !!sandbox?.ethereal?.output;

        if (hasServerSideProps) {
            logger.debug('SSR preloaded server-side props', {
                operation: 'ssr-render',
                componentType,
                serverSidePropsKeys: Object.keys(sandbox.ethereal.serverSideProps || {}),
                renderTimeMs: renderTime,
            });
        }

        logger.info('SSR render completed successfully', {
            operation: 'ssr-render',
            componentType,
            renderTimeMs: renderTime,
            hasOutput,
            hasServerSideProps,
            outputLength: sandbox?.ethereal?.output?.length || 0,
        });

        return {output: sandbox?.ethereal?.output, serverSideProps: sandbox?.ethereal?.serverSideProps}

    } catch (e) {
        const renderTime = Date.now() - startTime;

        logger.error('SSR rendering failed', e, {
            operation: 'ssr-render',
            componentType,
            assetPath: jsAsset[0].filePath,
            propsKeys: Object.keys(componentProps),
            renderTimeMs: renderTime,
        });

        return {output: "", serverSideProps: undefined};
    }

}
