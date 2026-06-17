// v3/v4 versioning gate. Reinstates the URL-flag pattern documented in
// docs/05-ui-ux-spec.md §12/§14/§16/§18 (the original devVersion.ts was removed
// in FXSW-047 when v2 was promoted to GA). Components and services branch on
// `isV3()` / `isV4()`; no version prop is threaded through the tree.
//
// With no `?dev=v3`/`?dev=v4` query flag the app renders the bare-URL GA tree
// unchanged. `isV3()`/`isV4()` are functions (not just consts) so tests can
// re-import the module with a cache-buster query and re-evaluate against a
// freshly stubbed location.
//
// v4 is a SUPERSET of v3 (FXSW-072): under `?dev=v4`, `isV3()` is also true, so
// every existing v3 call site lights up. v4 adds the new instruments (NDF, swap);
// the bid/ask forward-points refinement is a v3-level change, not v4-gated.

export type DevVersion = 'v1' | 'v3' | 'v4';

function parseDevVersion(): DevVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    const dev = new URLSearchParams(window.location.search).get('dev');
    if (dev === 'v4') return 'v4';
    if (dev === 'v3') return 'v3';
    return 'v1';
  } catch {
    return 'v1';
  }
}

export const devVersion: DevVersion = parseDevVersion();

// v4 ⊇ v3: v4 implies all v3 behaviour.
export const isV3 = (): boolean => devVersion === 'v3' || devVersion === 'v4';

export const isV4 = (): boolean => devVersion === 'v4';
