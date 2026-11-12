const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', '.playwright-mcp/**'],
  },
  expoConfig,
]);
