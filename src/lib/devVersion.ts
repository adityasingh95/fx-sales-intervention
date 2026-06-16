// v3 versioning gate. Reinstates the URL-flag pattern documented in
// docs/05-ui-ux-spec.md §12/§14 (the original devVersion.ts was removed in
// FXSW-047 when v2 was promoted to GA). Components and services branch on
// `isV3()`; no version prop is threaded through the tree.
//
// With no `?dev=v3` query flag the app renders the bare-URL GA tree unchanged.
// `isV3()` is a function (not just a const) so tests can re-import the module
// with a cache-buster query and re-evaluate against a freshly stubbed location.

export type DevVersion = 'v1' | 'v3';

function parseDevVersion(): DevVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    return new URLSearchParams(window.location.search).get('dev') === 'v3'
      ? 'v3'
      : 'v1';
  } catch {
    return 'v1';
  }
}

export const devVersion: DevVersion = parseDevVersion();

export const isV3 = (): boolean => devVersion === 'v3';
