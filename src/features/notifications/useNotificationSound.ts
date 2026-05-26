import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '@/state/stores/notificationsStore';
import { useSettingsStore } from '@/state/stores/settingsStore';

// Audio chime hook per docs/02 §5.3. Plays a 180ms 880Hz sine via the
// WebAudio API on each new SI notification. Gated by:
//   - settingsStore.muted (false to play)
//   - audio unlock (browsers block autoplay until the first user
//     gesture; we resume the AudioContext on the first click/keydown
//     anywhere in the document).
//
// The hook is mounted once at the app root and is a side-effect-only
// hook (no return value).

const CHIME_FREQ_HZ = 880;
const CHIME_DURATION_S = 0.18;
const CHIME_GAIN = 0.15;

// Module-scoped singleton — one AudioContext per app session. Lazy so
// the first interaction (rather than module load) is what attempts the
// WebAudio init, which keeps tests clean.
type AudioCtxLike = {
  readonly currentTime: number;
  readonly destination: AudioNode;
  resume: () => Promise<void> | void;
  createOscillator: () => OscillatorNode;
  createGain: () => GainNode;
};

let audioCtx: AudioCtxLike | null = null;
let unlocked = false;
let audioCtxFactory: () => AudioCtxLike | null = () => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return Ctor ? new Ctor() : null;
};

function ensureCtx(): AudioCtxLike | null {
  if (!audioCtx) audioCtx = audioCtxFactory();
  return audioCtx;
}

function unlock(): void {
  if (unlocked) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  void ctx.resume();
  unlocked = true;
}

function playChime(): void {
  if (!unlocked) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = CHIME_FREQ_HZ;
  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(CHIME_GAIN, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + CHIME_DURATION_S);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + CHIME_DURATION_S);
}

export function useNotificationSound(): void {
  const muted = useSettingsStore((s) => s.muted);
  const notifiedSize = useNotificationsStore((s) => s.notifiedDealIds.size);
  const lastSeenSize = useRef(notifiedSize);

  // Audio unlock on the first user gesture anywhere in the document.
  useEffect(() => {
    if (unlocked) return;
    const handler = (): void => unlock();
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

  // Play the chime whenever the notified-deals set grows. Skipped when
  // muted or when audio hasn't been unlocked yet.
  useEffect(() => {
    if (notifiedSize > lastSeenSize.current) {
      if (!muted) playChime();
    }
    lastSeenSize.current = notifiedSize;
  }, [notifiedSize, muted]);
}

// Test-only helpers. Production code should never call these.
export const _audio = {
  setFactory(fn: () => AudioCtxLike | null): void {
    audioCtxFactory = fn;
  },
  reset(): void {
    audioCtx = null;
    unlocked = false;
  },
  isUnlocked(): boolean {
    return unlocked;
  },
  forceUnlock(): void {
    unlock();
  },
};
