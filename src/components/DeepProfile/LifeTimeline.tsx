import { useMemo } from 'react';
import { useStore } from '../../store/store';
import { Link } from 'react-router-dom';
import type { LifeEventType } from '../../types';

const ICON: Record<LifeEventType, string> = {
  birth: '👶', marriage: '💍', childBirth: '🍼', death: '🕯️',
  education: '🎓', work: '💼', move: '🏠', achievement: '🏆',
  meeting: '🤝', travel: '✈️', custom: '⭐',
};

export function LifeTimeline({
  ownerId, ownerType, onAdd,
}: {
  ownerId: string;
  ownerType: 'person' | 'couple';
  onAdd: () => void;
}) {
  const events = useStore((s) => s.events);
  const list = useMemo(() => {
    return Object.values(events)
      .filter((e) => !e.isDeleted && e.ownerId === ownerId && e.ownerType === ownerType)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }, [events, ownerId, ownerType]);

  return (
    <div>
      <div className="space-y-3">
        {list.length === 0 && <div className="text-sm opacity-60">Событий пока нет</div>}
        {list.map((e) => (
          <div key={e.id} className="relative rounded-xl border p-4 pl-12"
               style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-2)' }}>
            <span className="absolute left-4 top-4 text-2xl">{ICON[e.type]}</span>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="text-base font-medium">{e.title}</h3>
              {e.date && <span className="text-xs opacity-60">{e.date}</span>}
              {e.location && <span className="text-xs opacity-60">· {e.location}</span>}
            </div>
            {e.description && <p className="mt-1 text-sm opacity-80 whitespace-pre-line">{e.description}</p>}
            {e.linkedEntities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {e.linkedEntities.map((le, i) => (
                  <Link
                    key={i}
                    to={le.type === 'person' ? `/person/${le.id}`
                        : le.type === 'importantPerson' ? `/important-person/${le.id}` : '#'}
                    className="rounded-md border px-2 py-0.5 hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                  >
                    {le.role ? `${le.role}: ` : ''}#{le.id.slice(-5)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        className="mt-4 rounded-lg border px-3 py-1.5 text-sm opacity-80 hover:opacity-100"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={onAdd}
      >+ Добавить событие</button>
    </div>
  );
}
