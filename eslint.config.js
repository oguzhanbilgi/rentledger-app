// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    // Otomasyon scriptleri Node ortamında çalışır.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'android/*', 'ios/*'],
  },
]);
