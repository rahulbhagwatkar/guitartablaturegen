// webpack.config.js
module.exports = {
  // ... other config
  devServer: {
    // Replace deprecated options:
    setupMiddlewares: (middlewares, devServer) => {
      // Add custom middlewares here if needed
      return middlewares;
    },
    // ... other devServer settings
  },
};