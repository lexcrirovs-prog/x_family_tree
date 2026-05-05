import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { useStore } from '../../store/store';
import { Link } from 'react-router-dom';

export function SearchBox() {
  const people = useStore((s) => s.people);
  const importantPeople = useStore((s) => s.importantPeople);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const ps = Object.values(people)
      .filter((p) => !p.isDeleted)
      .map((p) => ({
        kind: 'person' as const,
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        sub: [p.birthYear, p.deathYear].filter(Boolean).join(' – '),
      }));
    const ips = Object.values(importantPeople)
      .filter((p) => !p.isDeleted)
      .map((p) => ({
        kind: 'importantPerson' as const,
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        sub: p.relationshipType,
      }));
    return [...ps, ...ips];
  }, [people, importantPeople]);

  const fuse = useMemo(() => new Fuse(items, { keys: ['name', 'sub'], threshold: 0.4 }), [items]);
  const results = query ? fuse.search(query).slice(0, 8).map((r) => r.item) : [];

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Поиск (Fuzzy)…"
        className="w-full"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border z-20"
             style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          {results.map((r) => (
            <Link
              key={`${r.kind}_${r.id}`}
              to={r.kind === 'person' ? `/person/${r.id}` : `/important-person/${r.id}`}
              className="block px-3 py-2 hover:opacity-80"
              onClick={() => { setQuery(''); setOpen(false); }}
            >
              <div className="text-sm">{r.name}</div>
              <div className="text-xs opacity-60">{r.sub} · {r.kind === 'person' ? 'член семьи' : 'важный человек'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
