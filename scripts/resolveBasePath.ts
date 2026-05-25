// Single source of truth for the Vite `base` path resolution.
// Lives outside vite.config.ts so vitest (running under the app
// tsconfig project) can import + test it without dragging vite +
// esbuild + plugin-react through jsdom.
export const resolveBasePath = (envValue: string | undefined): string =>
  envValue && envValue.length > 0 ? envValue : '/';
