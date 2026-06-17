import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { resolveBasePath } from './scripts/resolveBasePath';

// FXSW-088 (security): ship a restrictive Content-Security-Policy on the built
// site as client-side defence-in-depth. Injected at BUILD only (the dev server
// needs inline scripts / eval / ws for HMR), so it is active in `preview` (which
// the E2E suite runs against) and in production, but not in `vite dev`.
//
// `connect-src 'self'` covers the default simulated feed (the only test/E2E
// path). The opt-in `?dev=v3` live reference-mid poller calls an external host;
// enabling that under an enforced CSP would require adding the provider origin to
// `connect-src` (intentionally omitted here to keep the build output brand-neutral
// and the surface minimal — the live poller is off by default).
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

export default defineConfig({
  base: resolveBasePath(process.env.VITE_BASE_PATH),
  plugins: [react(), cspPlugin()],
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
