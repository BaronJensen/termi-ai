
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig(({ command, mode }) => ({
  root: __dirname,
  // Ensure built asset paths are relative so they work with file:// in Electron
  base: command === 'build' ? './' : '/',
  server: {
    port: 5174,
    strictPort: true
  },
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
}));
