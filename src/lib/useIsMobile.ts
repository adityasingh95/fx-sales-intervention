import { useEffect, useState } from 'react';

// FXSW-042: Returns `true` when the viewport is narrower than Tailwind's
// `md` breakpoint (768px). Listens for resize via matchMedia so the
// layout switches live as the user resizes / rotates.
//
// SSR-safe — returns `false` (desktop default) until the browser-side
// effect runs.

const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent): void => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
