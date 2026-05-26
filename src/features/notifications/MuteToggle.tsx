import { Bell, BellOff } from 'lucide-react';
import { useSettingsStore } from '@/state/stores/settingsStore';

// Header mute affordance per docs/02 §5.4. Bell when sound is on,
// BellOff when muted. Click toggles + persists to sessionStorage via
// the settings store.

export default function MuteToggle() {
  const muted = useSettingsStore((s) => s.muted);
  const toggleMute = useSettingsStore((s) => s.toggleMute);
  const Icon = muted ? BellOff : Bell;
  return (
    <button
      type="button"
      data-testid="mute-toggle"
      data-muted={muted ? 'true' : 'false'}
      aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
      aria-pressed={muted}
      onClick={toggleMute}
      className="rounded-sm p-1 text-text-dim transition-colors hover:text-text"
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}
