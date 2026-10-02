import { list, type Plugin } from 'postcss';
import type { Plugin as VitePlugin } from 'vite';

/** Keep every KaTeX face, but ship a single font format supported by our browsers/WebViews. */
export function modernMathFonts(): Plugin {
  return {
    postcssPlugin: 'modern-math-fonts',
    AtRule: {
      'font-face': rule => {
        const family = rule.nodes?.find(node => node.type === 'decl' && node.prop === 'font-family');
        if (family?.type !== 'decl' || !/^['"]?KaTeX_/.test(family.value)) return;
        rule.walkDecls('src', declaration => {
          const sources = list.comma(declaration.value).filter(source => /format\(['"]?woff2['"]?\)/i.test(source));
          // Preserve a future vendor face that has no WOFF2 source rather than breaking it.
          const modernSource = sources.join(',');
          if (sources.length && modernSource !== declaration.value) declaration.value = modernSource;
        });
      },
    },
  };
}

/** Vite resolves font URLs before PostCSS; remove the now-unreferenced fallbacks it emitted. */
export function pruneLegacyMathFonts(): VitePlugin {
  return {
    name: 'prune-unused-math-fonts',
    apply: 'build',
    generateBundle(_, bundle) {
      const references = Object.values(bundle).flatMap(asset => {
        if (asset.type === 'chunk') return [asset.code];
        if (asset.fileName.endsWith('.css')) return [String(asset.source)];
        return [];
      });
      let saved = 0;
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !/(?:^|\/)KaTeX_[^/]+\.(?:woff|ttf)$/.test(fileName)) continue;
        const basename = fileName.slice(fileName.lastIndexOf('/') + 1);
        if (references.some(content => content.includes(basename))) continue;
        saved += typeof asset.source === 'string' ? Buffer.byteLength(asset.source) : asset.source.byteLength;
        delete bundle[fileName];
      }
      if (saved) this.info(`KaTeX: ${Math.round(saved / 1024)} KiB of redundant font formats omitted.`);
    },
  };
}
