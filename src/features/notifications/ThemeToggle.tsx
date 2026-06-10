import { Moon, Sun } from 'lucide-react';
import { getThemePreviewEnabled } from '@/lib/themeMode';
import { useThemeStore } from '@/state/stores/themeStore';

export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  if (!getThemePreviewEnabled()) return null;

  const isLight = mode === 'light';
  const Icon = isLight ? Moon : Sun;
  const targetLabel = isLight ? 'dark theme' : 'light theme';

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      data-theme-mode={mode}
      aria-label={`Switch to ${targetLabel}`}
      aria-pressed={isLight}
      onClick={toggle}
      className="rounded-sm p-1 text-text-dim transition-colors hover:text-text"
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}
