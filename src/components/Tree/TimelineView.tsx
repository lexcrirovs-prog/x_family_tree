import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../../store/store';
import { Avatar } from '../Avatar';
import { HISTORICAL_MILESTONES } from '../../data/milestones';

type Track = { kind: 'family' | 'important'; label: string; personIds: string[]; importantIds: string[] };

export function TimelineView({ onEditPerson }: { onEditPerson: (id: string) => void }) {
  const people = useStore((s) => s.people);
  const couples = useStore((s) => s.couples);
  const importantPeople = useStore((s) => s.importantPeople);
  const events = useStore((s) => s.events);
  const showImp = useStore((s) => s.showImportantPeople);
  const toggleImp = useStore((s) => s.toggleImportantPeople);
  const showMilestones = useStore((s) => s.showMilestones);
  const toggleMilestones = useStore((s) => s.toggleMilestones);

  const yearsRange = useMemo(() => {
    const years: number[] = [];
    Object.values(people).forEach((p) => {
      if (p.birthYear) years.push(p.birthYear);
      if (p.deathYear) years.push(p.deathYear);
    });
    Object.values(importantPeople).forEach((p) => {
      if (p.birthYear) years.push(p.birthYear);
      if (p.deathYear) years.push(p.deathYear);
    });
    const min = years.length ? Math.min(...years) - 5 : 1900;
    const max = years.length ? Math.max(...years, new Date().getFullYear()) + 5 : new Date().getFullYear();
    return { min, max };
  }, [people, importantPeople]);

  const [zoom, setZoom] = useState(1);
  const [labelW, setLabelW] = useState(240);
  useEffect(() => {
    const onResize = () => {
      setLabelW(window.innerWidth < 640 ? 140 : 240);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const yearWidth = 14 * zoom;
  const totalYears = yearsRange.max - yearsRange.min;
  const totalWidth = totalYears * yearWidth + labelW;

  // Group people by family unit (couple); orphans go to "Прочие"
  const tracks = useMemo<Track[]>(() => {
    const out: Track[] = [];
    const usedPeopleIds = new Set<string>();

    Object.values(couples)
      .filter((c) => !c.isDeleted)
      .sort((a, b) => (a.marriageYear ?? 0) - (b.marriageYear ?? 0))
      .forEach((c) => {
        const a = people[c.partnerAId];
        const b = people[c.partnerBId];
        if (!a || !b) return;
        const ids = [c.partnerAId, c.partnerBId, ...c.childrenIds];
        ids.forEach((id) => usedPeopleIds.add(id));
        out.push({
          kind: 'family',
          label: `${a.firstName} ${a.lastName} + ${b.firstName} ${b.lastName}`.trim(),
          personIds: ids,
          importantIds: [],
        });
      });

    const others = Object.values(people)
      .filter((p) => !p.isDeleted && !usedPeopleIds.has(p.id))
      .map((p) => p.id);
    if (others.length) out.push({ kind: 'family', label: 'Прочие', personIds: others, importantIds: [] });

    if (showImp) {
      const ipIds = Object.values(importantPeople).filter((p) => !p.isDeleted).map((p) => p.id);
      if (ipIds.length) out.push({ kind: 'important', label: 'Важные люди', personIds: [], importantIds: ipIds });
    }

    return out;
  }, [couples, people, importantPeople, showImp]);

  const PersonRow = ({ id }: { id: string }) => {
    const p = people[id];
    if (!p || p.isDeleted) return null;
    const start = p.birthYear ?? yearsRange.min;
    const end = p.deathYear ?? new Date().getFullYear();
    const left = labelW + (start - yearsRange.min) * yearWidth;
    const width = Math.max(20, (end - start) * yearWidth);
    const personEvents = p.lifeEventIds
      .map((id) => events[id])
      .filter((e) => e && !e.isDeleted && e.date)
      .map((e) => ({ ...e, year: Number(e.date!.slice(0, 4)) }));
    return (
      <div className="relative h-12 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="absolute left-2 top-1.5 flex items-center gap-2" style={{ width: labelW - 10 }}>
          <Avatar photoId={p.photoIds[0]} name={`${p.firstName} ${p.lastName}`} gender={p.gender} size={32} />
          <div className="min-w-0">
            <div className="truncate text-sm">{p.firstName} {p.lastName}</div>
            <div className="text-[10px] opacity-60">{p.birthYear ?? '?'} – {p.deathYear ?? 'наст.'}</div>
          </div>
        </div>
        <div
          className="absolute top-3 h-6 cursor-pointer rounded-md"
          style={{
            left, width,
            background: p.gender === 'female' ? 'rgba(255,158,199,0.35)' : 'rgba(124,156,255,0.35)',
            border: '1px solid currentColor',
            color: p.gender === 'female' ? '#ff9ec7' : '#7c9cff',
          }}
          onClick={() => onEditPerson(p.id)}
          title={`${p.firstName} ${p.lastName}`}
        >
          {personEvents.map((e) => (
            <span
              key={e.id}
              className="absolute top-0 h-full w-1 rounded"
              style={{ left: (e.year - start) * yearWidth, background: 'currentColor' }}
              title={e.title}
            />
          ))}
        </div>
      </div>
    );
  };

  const ImportantRow = ({ id }: { id: string }) => {
    const ip = importantPeople[id];
    if (!ip || ip.isDeleted) return null;
    const start = ip.birthYear ?? yearsRange.min;
    const end = ip.deathYear ?? new Date().getFullYear();
    const left = labelW + (start - yearsRange.min) * yearWidth;
    const width = Math.max(20, (end - start) * yearWidth);
    return (
      <div className="relative h-10 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="absolute left-2 top-1 flex items-center gap-2" style={{ width: labelW - 10 }}>
          <span className="inline-block h-3 w-3 rotate-45 border" style={{ borderColor: 'var(--color-accent)' }} />
          <div className="min-w-0">
            <div className="truncate text-xs">{ip.firstName} {ip.lastName}</div>
            <div className="text-[10px] opacity-60">{ip.relationshipType}</div>
          </div>
        </div>
        <div
          className="absolute top-2.5 h-5 cursor-pointer rounded-md"
          style={{
            left, width,
            background: 'rgba(124,156,255,0.15)',
            border: '1px dashed var(--color-accent)',
            color: 'var(--color-accent)',
          }}
          title={`${ip.firstName} ${ip.lastName}`}
        />
      </div>
    );
  };

  return (
    <div className="relative h-full w-full" style={{ background: 'var(--color-bg)' }}>
      <div className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-1 rounded-lg border p-1 backdrop-blur"
           style={{ borderColor: 'var(--color-border)', background: 'rgba(28,28,36,0.6)' }}>
        <button
          className="rounded border px-2 py-1 text-xs"
          style={{
            borderColor: 'var(--color-border)',
            background: showMilestones ? 'var(--color-accent)' : 'transparent',
            color: showMilestones ? '#fff' : 'inherit',
          }}
          onClick={toggleMilestones}
          title="Исторические события (войны, эпохи)"
        >📜 Вехи истории</button>
        <button
          className="rounded border px-2 py-1 text-xs"
          style={{
            borderColor: 'var(--color-border)',
            background: showImp ? 'var(--color-accent)' : 'transparent',
            color: showImp ? '#fff' : 'inherit',
          }}
          onClick={toggleImp}
          title="Важные люди вне семьи"
        >◆ Важные люди</button>
        <span className="mx-1 opacity-30">|</span>
        <button className="rounded px-2 py-1 text-sm" onClick={() => setZoom((z) => Math.max(0.4, z - 0.25))}>−</button>
        <button className="rounded px-2 py-1 text-sm" onClick={() => setZoom(1)}>1×</button>
        <button className="rounded px-2 py-1 text-sm" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
      </div>
      <div className="scrollbar h-full w-full overflow-auto">
      <div className="relative" style={{ width: totalWidth, paddingTop: 40 }}>
        {showMilestones && (
          <div className="pointer-events-none absolute inset-0 z-[1]">
            {HISTORICAL_MILESTONES.map((m, i) => {
              if (m.kind === 'range') {
                if (m.to < yearsRange.min || m.from > yearsRange.max) return null;
                const left = labelW + (Math.max(m.from, yearsRange.min) - yearsRange.min) * yearWidth;
                const width = (Math.min(m.to, yearsRange.max) - Math.max(m.from, yearsRange.min)) * yearWidth;
                return (
                  <div key={i} className="pointer-events-auto absolute top-10 bottom-0"
                       style={{ left, width, background: `${m.color ?? '#666'}26`, borderLeft: `1px solid ${m.color ?? '#666'}88`, borderRight: `1px solid ${m.color ?? '#666'}88` }}
                       title={`${m.label} (${m.from}–${m.to})`}>
                    <div className="sticky top-10 mt-1 rounded-r px-1.5 text-[10px] font-medium"
                         style={{ background: `${m.color ?? '#666'}cc`, color: '#fff', display: 'inline-block' }}>
                      {m.label}
                    </div>
                  </div>
                );
              }
              if (m.year < yearsRange.min || m.year > yearsRange.max) return null;
              const left = labelW + (m.year - yearsRange.min) * yearWidth;
              return (
                <div key={i} className="pointer-events-auto absolute top-10 bottom-0"
                     style={{ left, width: 0, borderLeft: `1.5px dashed ${m.color ?? '#888'}` }}
                     title={`${m.label} (${m.year})`}>
                  <div className="sticky top-10 ml-1 mt-1 rounded px-1.5 text-[10px] font-medium"
                       style={{ background: `${m.color ?? '#888'}cc`, color: '#fff', display: 'inline-block' }}>
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="sticky top-0 z-10 h-10 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
          {Array.from({ length: Math.ceil(totalYears / 10) + 1 }).map((_, i) => {
            const year = yearsRange.min + i * 10;
            return (
              <div key={year} className="absolute top-0 h-full border-l text-xs"
                   style={{ left: labelW + i * 10 * yearWidth, borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                <span className="ml-1">{year}</span>
              </div>
            );
          })}
        </div>

        {tracks.map((track, i) => (
          <div key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div
              className="sticky left-0 z-[5] flex items-center px-3 py-1 text-xs uppercase tracking-wider"
              style={{
                background: track.kind === 'important' ? 'rgba(124,156,255,0.08)' : 'var(--color-bg-2)',
                color: 'var(--color-muted)',
              }}
            >
              {track.kind === 'important' ? '◆ ' : '👪 '}{track.label}
            </div>
            {track.personIds.map((id) => <PersonRow key={id} id={id} />)}
            {track.importantIds.map((id) => <ImportantRow key={id} id={id} />)}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
