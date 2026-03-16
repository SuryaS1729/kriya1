const { withRozenite } = require('@rozenite/metro');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withRozenite(withNativeWind(config, { input: './global.css' }), { enabled: process.env.WITH_ROZENITE === 'true' });