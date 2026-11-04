const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add glb and gltf to asset extensions
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;
