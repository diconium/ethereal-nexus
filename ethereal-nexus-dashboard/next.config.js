/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        net: false,
        tls: false,
        perf_hooks: false,
        fs: false
      };
    }

    return config;
  },
};
