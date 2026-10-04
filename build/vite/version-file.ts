import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Publie `version.json` à côté du bundle.
 *
 * Le service worker a été retiré : la page compare la version servie à la
 * version compilée (`__APP_VERSION__`) pour proposer une mise à jour. Un
 * simple rechargement suffit, il n'y a plus de cache à faire tourner.
 */
export function versionFile(): Plugin {
  let root: string;
  let outDir: string;
  return {
    name: 'version-file',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(root, config.build.outDir);
    },
    closeBundle() {
      const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { version?: unknown };
      const payload = {
        version: typeof metadata.version === 'string' ? metadata.version : '0.0.0',
        builtAt: new Date().toISOString(),
      };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`);
      this.info(`version.json : ${payload.version}`);
    },
  };
}
