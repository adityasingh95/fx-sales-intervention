import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { resolveBasePath } from './scripts/resolveBasePath';

// FXSW-088 (security): ship a restrictive Content-Security-Policy on the built
// site as client-side defence-in-depth. Injected at BUILD only (the dev server
// needs inline scripts / eval / ws for HMR), so it is active in `preview` (which
// the E2E suite runs against) and in production, but not in `vite dev`.
//
// `connect-src 'self'` covers the simulated feed — the default and the only path
// that ships. The opt-in live reference-mid poller (and its API-key entry) is
// confined to the dev server (`import.meta.env.DEV`, see main.tsx / App.tsx), so
// the production build never needs the external provider origin here and never
// collects the key under a policy that would block the poll (FXSW-091 T-2). This
// keeps `connect-src` same-origin and the build output brand-neutral.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  // style attributes (style={{…}}) and Vite's injected styles need inline styles.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'fxsw-inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_DIRECTIVES },
          injectTo: 'head-prepend',
        },
      ],
    };
  },
});

// FXSW-091 (T-3): add Subresource Integrity to the emitted same-origin
// `<script>` / `<link rel=stylesheet>` tags at build, computing each asset's
// SHA-384 from the final bundle content. Build-only (no bundle in dev); complements
// `script-src 'self'` so a tampered asset is rejected by the browser.
const sriPlugin = (): Plugin => {
  let base = '/';
  return {
    name: 'fxsw-sri',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(html, ctx) {
      const bundle = ctx.bundle;
      if (!bundle) return html;
      const integrityFor = (url: string): string | null => {
        if (!url.startsWith(base)) return null;
        const key = url.slice(base.length).replace(/^\//, '');
        const item = bundle[key];
        if (!item) return null;
        const content = item.type === 'chunk' ? item.code : item.source;
        return `sha384-${createHash('sha384').update(content).digest('base64')}`;
      };
      return html.replace(/<(?:script|link)\b[^>]*>/g, (tag) => {
        if (/\bintegrity=/.test(tag)) return tag;
        if (tag.startsWith('<link') && !/rel="stylesheet"/.test(tag)) return tag;
        const ref = tag.match(/\b(?:src|href)="([^"]+)"/);
        const integrity = ref ? integrityFor(ref[1]) : null;
        if (!integrity) return tag;
        const attrs = `integrity="${integrity}"${/\bcrossorigin\b/.test(tag) ? '' : ' crossorigin'}`;
        return tag.endsWith('/>')
          ? tag.replace(/\/>$/, `${attrs} />`)
          : tag.replace(/>$/, ` ${attrs}>`);
      });
    },
  };
};

export default defineConfig({
  base: resolveBasePath(process.env.VITE_BASE_PATH),
  plugins: [react(), cspPlugin(), sriPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
