/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  experimental: {
    serverMinification: false
  },
  headers: async () => {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ]
      }
    ]
}
};
