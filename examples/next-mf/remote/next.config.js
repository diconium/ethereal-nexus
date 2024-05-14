const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'remote',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './Button': './components/Button.js',
        },
        remotes: {},
        shared: {},
        extraOptions:{
          exposePages: false
        }
      }),
    );

    return config;
  },
};
