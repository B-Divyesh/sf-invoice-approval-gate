import { defineConfig, type Plugin } from 'vite';
import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function staticRoutes(): Plugin {
  return {
    name: 'send-gate-static-routes',
    apply: 'build',
    async closeBundle() {
      for (const route of ['privacy', 'terms', 'demo']) {
        const directory = resolve('dist', route);
        await mkdir(directory, { recursive: true });
        await copyFile(resolve('dist/index.html'), resolve(directory, 'index.html'));
      }
    },
  };
}

export default defineConfig({
  plugins: [staticRoutes()],
  build: {
    target: 'es2022',
    manifest: 'asset-manifest.json',
    sourcemap: true,
  },
});
