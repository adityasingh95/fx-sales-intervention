// Shared constants + types for the PricingPanel sub-components (FXSW-056 split).

export const STALE_MS = 3000;
export const FLASH_MS = 80;
export const GLOW_MS = 600;
export const MIN_MARGIN = 1;

export type FlashDir = 'up' | 'down' | null;
export type PricingMode = 'streaming' | 'fixed';
export type Side = 'bid' | 'ask';
