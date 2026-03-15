const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Basic scaffold of an Expo Config Plugin for iOS App Groups and Android Widgets
const withWidgets = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            // Logic to inject iOS App Group entitlements goes here
            // E.g. modifying `<project_root>/ios/<project_name>/<project_name>.entitlements`
            const iosPath = path.join(config.modRequest.platformProjectRoot, config.modRequest.projectName);
            console.log('--- Preparing iOS WidgetKit Extensions ---', iosPath);
            return config;
        },
    ]);
};

module.exports = withWidgets;
