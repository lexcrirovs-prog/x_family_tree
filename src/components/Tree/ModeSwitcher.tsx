import { GitFork, Orbit, Rows3 } from 'lucide-react';
import type { ViewMode } from '../../types/family';

const modes: Array<{ mode: ViewMode; label: string; icon: typeof GitFork; hotkey: string }> = [
  { mode: 'graph', label: 'Граф', icon: GitFork, hotkey: '1' },
  { mode: 'timeline', label: 'Таймлайн', icon: Rows3, hotkey: '2' },
  { mode: 'fan', label: 'Веер', icon: Orbit, hotkey: '3' },
];

type ModeSwitcherProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" aria-label="Режим отображения">
      {modes.map(({ mode, label, icon: Icon, hotkey }) => (
        <button
          key={mode}
          type="button"
          className={value === mode ? 'mode-button mode-button-active' : 'mode-button'}
          onClick={() => onChange(mode)}
          title={`${label} (${hotkey})`}
          aria-pressed={value === mode}
        >
          <Icon size={16} strokeWidth={1.9} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

