import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver. Provide a no-op polyfill so
// components that use it (e.g. ResizeHandle's container measurement) don't
// crash during tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
