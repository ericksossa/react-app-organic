const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const extraAssetExts = ['pv', 'rhn', 'ppn'];
config.resolver.assetExts = Array.from(new Set([...(config.resolver.assetExts ?? []), ...extraAssetExts]));

module.exports = config;

