import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Source scans and retired GIF demos are not used by the Android interface. */
export function isNativeAsset(relative: string): boolean {
  const normalized = relative.replaceAll('\\', '/');
  return !/^doc_officiel\/.*\.jpe?g$/i.test(normalized) && !/^showcase\/.*\.gif$/i.test(normalized);
}

export function nativeAssets(): Plugin {
  let root: string;
  let outDir: string;
  return {
    name: 'native-public-assets',
    apply: 'build',
    configResolved(config) { root = config.root; outDir = path.resolve(root, config.build.outDir); },
    writeBundle() {
      const source = path.join(root, 'public');
      let saved = 0;
      fs.cpSync(source, outDir, { recursive: true, filter: file => {
        if (isNativeAsset(path.relative(source, file))) return true;
        saved += fs.statSync(file).size;
        return false;
      } });
      this.info(`Android: ${(saved / 1_000_000).toFixed(2)} MB of unused scans/demos omitted; offline course data and help preserved.`);
    },
  };
}
