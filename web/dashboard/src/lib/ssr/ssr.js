import dynamicImport from "./dynamicImport";
import {TextEncoder} from "util";

export async function callSSR(componentType, componentProps = {}, assets) {

    const jsAsset = assets.filter(asset => asset.type === "server");

    if (jsAsset.length > 0) {
        try {
            console.debug("[SSR] Loading dynamic js from: ", jsAsset[0].filePath)

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
            console.log("[SSR] calling SSR with: ", sandbox.ethereal.props)
            await dynamicImport(jsAsset[0].filePath, sandbox);
            console.debug("[SSR] loaded: ", sandbox?.ethereal?.output)
            if (sandbox?.ethereal?.serverSideProps) {
                console.debug("[SSR] pre loaded this data:  ", sandbox?.ethereal?.serverSideProps)
            }

            return {output: sandbox?.ethereal?.output, serverSideProps: sandbox?.ethereal?.serverSideProps}

        } catch (e) {
            console.log("[SSR] There was a error rendering ssr: ", e)
        }

    }
    return {output: "", serverSideProps: undefined}

}
