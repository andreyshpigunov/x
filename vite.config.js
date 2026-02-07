import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
export default {
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, 'src/js/x.js'),
      ],
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'index' ? 'app.js' : '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const n = assetInfo.name || '';
          return n === 'index.css' || n === 'style.css' ? 'app.css' : '[name].[ext]';
        },
      },
    },
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 5173,
  },
};
