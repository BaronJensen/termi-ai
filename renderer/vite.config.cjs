
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  root: __dirname,
  server: {
    port: 5174,
    strictPort: true
  },
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
});
