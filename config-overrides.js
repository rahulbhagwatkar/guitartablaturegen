const { override } = require('customize-cra');

module.exports = override(
  (config) => {
    if (config.devServer) {
      config.devServer = {
        ...config.devServer,
        setupMiddlewares: (middlewares, devServer) => {
          if (!devServer) {
            throw new Error('webpack-dev-server is not defined');
          }
          return middlewares;
        }
      };
    }
    return config;
  }
);
