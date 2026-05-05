import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { useMediaUrl } from '../../hooks/useMediaUrl';

type Tab = 'all' | 'year' | 'age' | 'event';

export function PhotoGallery({
  photoIds, personBirthYear, onOpen,
}: {
  photoIds: string[];
  personBirthYear?: number;
  onOpen: (mediaId: string) => void;
}) {
  const media = useStore((s) => s.media);
  const events = useStore((s) => s.events);
  const [tab, setTab] = useState<Tab>('all');

  const photos = photoIds.map((id) => media[id]).filter((m) => m && m.type === 'photo');

  const grouped = useMemo(() => {
    if (tab === 'all') return { 'Все фото': photos };
    if (tab === 'year') {
      const acc: Record<string, typeof photos> = {};
      for (const p of photos) {
        const k = p.yearTaken ? String(p.yearTaken) : 'без даты';
        (acc[k] ??= []).push(p);
      }
      return acc;
    }
    if (tab === 'age') {
      if (!personBirthYear) return { 'Все фото (нет года рождения)': photos };
      const buckets: Record<string, typeof photos> = {};
      const ranges: [string, [number, number]][] = [
        ['0–5 лет', [0, 5]], ['6–12', [6, 12]], ['13–18', [13, 18]],
        ['19–25', [19, 25]], ['26–40', [26, 40]], ['41–60', [41, 60]], ['60+', [61, 200]],
      ];
      for (const p of photos) {
        if (!p.yearTaken) { (buckets['без даты'] ??= []).push(p); continue; }
        const age = p.yearTaken - personBirthYear;
        const found = ranges.find(([_, [lo, hi]]) => age >= lo && age <= hi);
        const key = found?.[0] ?? 'другое';
        (buckets[key] ??= []).push(p);
      }
      return buckets;
    }
    // by event
    const acc: Record<string, typeof photos> = {};
    for (const p of photos) {
      const ev = p.linkedEventId ? events[p.linkedEventId] : undefined;
      const k = ev ? ev.title : 'вне событий';
      (acc[k] ??= []).push(p);
    }
    return acc;
  }, [tab, photos, personBirthYear, events]);

  if (photos.length === 0) {
    return <div className="text-sm opacity-60">Фото пока нет. Добавьте через редактирование человека.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 text-sm">
        {(['all', 'year', 'age', 'event'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-md border px-2.5 py-1"
            style={{
              background: tab === t ? 'var(--color-accent)' : 'transparent',
              color: tab === t ? '#fff' : 'inherit',
              borderColor: 'var(--color-border)',
            }}
          >
            {t === 'all' ? 'Все' : t === 'year' ? 'По годам' : t === 'age' ? 'По возрасту' : 'По событиям'}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {Object.entries(grouped).map(([k, list]) => (
          <div key={k}>
            <div className="mb-2 text-xs uppercase tracking-wider opacity-60">{k}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {list.map((m) => <Thumb key={m.id} id={m.id} onClick={() => onOpen(m.id)} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Thumb({ id, onClick }: { id: string; onClick: () => void }) {
  const url = useMediaUrl(id);
  return (
    <button
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <img src={url} alt="" className="h-full w-full object-cover transition hover:scale-105" />
    </button>
  );
}
