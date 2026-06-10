export function parseThemePreviewEnabled(search: string): boolean {
  return new URLSearchParams(search).get('theme') === 'preview';
}

export function getThemePreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return parseThemePreviewEnabled(window.location.search);
}
