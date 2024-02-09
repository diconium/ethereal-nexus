/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  webpack: (config, { webpack, isServer, nextRuntime }) => {
    if (!isServer) {
      config.resolve.fallback = {
        net: false,
        tls: false,
        perf_hooks: false,
        fs: false,
      };
    }

    if(nextRuntime === 'edge') {
      config.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /^cloudflare:sockets$/,
      }))
    }

    return config
  },
};
