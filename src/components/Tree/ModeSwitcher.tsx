import { useEffect } from 'react';
import { useStore } from '../../store/store';

export function ModeSwitcher() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') setViewMode('graph');
      if (e.key === '2') setViewMode('timeline');
      if (e.key === '3') setViewMode('fan');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setViewMode]);

  const Btn = ({ m, label, icon }: { m: 'graph' | 'timeline' | 'fan'; label: string; icon: string }) => (
    <button
      onClick={() => setViewMode(m)}
      className="flex h-10 w-10 items-center justify-center rounded-lg border text-base transition"
      style={{
        background: viewMode === m ? 'var(--color-accent)' : 'var(--color-panel)',
        borderColor: 'var(--color-border)',
        color: viewMode === m ? '#fff' : 'var(--color-text)',
      }}
      title={label}
    >{icon}</button>
  );

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-xl border p-1.5 backdrop-blur"
         style={{ borderColor: 'var(--color-border)', background: 'rgba(28,28,36,0.6)' }}>
      <Btn m="graph" label="Граф (1)" icon="◉" />
      <Btn m="timeline" label="Таймлайн (2)" icon="≡" />
      <Btn m="fan" label="Веер (3)" icon="◐" />
    </div>
  );
}
