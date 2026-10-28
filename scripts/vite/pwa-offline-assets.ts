import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** Bundle the same offline application and course data used by the native build. */
export function pwaOfflineAssets(): Plugin {
  let outDir: string;
  return {
    name: 'pwa-offline-assets',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    writeBundle() {
      const files: string[] = [];
      const collect = (directory: string) => {
        if (!fs.existsSync(path.join(outDir, directory))) return;
        for (const entry of fs.readdirSync(path.join(outDir, directory), { withFileTypes: true })) {
          const relative = path.posix.join(directory, entry.name);
          if (entry.isDirectory()) collect(relative);
          else files.push(relative);
        }
      };
      for (const directory of ['assets', 'contenus', 'fonts', 'guide', 'icons']) collect(directory);
      for (const name of fs.readdirSync(outDir)) {
        if (/\.(?:ttf|otf|json|svg|webmanifest)$/i.test(name) && name !== 'version.json') files.push(name);
      }
      files.sort();
      const hash = createHash('sha256');
      for (const name of ['index.html', ...files]) {
        hash.update(name).update(fs.readFileSync(path.join(outDir, name)));
      }
      const workerPath = path.join(outDir, 'sw.js');
      const worker = fs.readFileSync(workerPath, 'utf8')
        .replace("const BUILD_ID = 'development';", `const BUILD_ID = '${hash.digest('hex').slice(0, 16)}';`)
        .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(files.map(file => `/${file}`))};`);
      fs.writeFileSync(workerPath, worker);
      this.info(`PWA: ${files.length} resources prepared for offline use.`);
    },
  };
}
