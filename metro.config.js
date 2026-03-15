// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware, server) => {
        const baseMiddleware = originalEnhanceMiddleware
            ? originalEnhanceMiddleware(middleware, server)
            : middleware;
        return (req, res, next) => {
            res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
            res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
            return baseMiddleware(req, res, next);
        };
    },
};

module.exports = withNativeWind(config, { input: './global.css' });
