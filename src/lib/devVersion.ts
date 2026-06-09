export type DevVersion = 'v1' | 'v2';

export function parseDevVersion(search: string): DevVersion {
  return new URLSearchParams(search).get('dev') === 'v2' ? 'v2' : 'v1';
}

export function getDevVersion(): DevVersion {
  if (typeof window === 'undefined') return 'v1';
  return parseDevVersion(window.location.search);
}
