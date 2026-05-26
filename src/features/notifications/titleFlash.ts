// Document-title flash per docs/02 §5.2. Prefixes "● " for 5s after a
// notification fires, then restores the original title. Idempotent —
// repeated calls within the 5s window reset the timer but don't double-
// prefix the title.

const FLASH_MS = 5000;

let originalTitle: string | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function flashDocumentTitle(): void {
  if (typeof document === 'undefined') return;
  if (originalTitle === null) originalTitle = document.title;
  if (!document.title.startsWith('● ')) {
    document.title = `● ${originalTitle}`;
  }
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (originalTitle !== null) document.title = originalTitle;
    timeoutId = null;
  }, FLASH_MS);
}

// Test-only helper to reset module state between tests.
export function _resetTitleFlash(): void {
  if (timeoutId) clearTimeout(timeoutId);
  if (originalTitle !== null && typeof document !== 'undefined') {
    document.title = originalTitle;
  }
  originalTitle = null;
  timeoutId = null;
}
