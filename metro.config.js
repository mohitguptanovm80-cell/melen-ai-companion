const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add glb and gltf to asset extensions
config.resolver.assetExts.push('glb', 'gltf');

// Keep Azure credentials in the Node process, outside the mobile bundle.
const previousEnhancer = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const next = previousEnhancer ? previousEnhancer(metroMiddleware, server) : metroMiddleware;
  const { middleware } = require('./server/azure.cjs');
  return (req, res) => middleware(req, res, () => next(req, res));
};

module.exports = config;
