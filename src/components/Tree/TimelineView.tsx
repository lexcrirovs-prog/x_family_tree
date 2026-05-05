import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import type { HistoricalMilestone, ImportantPerson, Person } from '../../types/family';
import { activePeople, getEventsForPerson, getFullName, getYears } from '../../utils/family';

const START_YEAR = 1800;

const historicalMilestones: HistoricalMilestone[] = [
  {
    id: 'ww2',
    title: 'Великая Отечественная война',
    startYear: 1941,
    endYear: 1945,
    description: '1941-1945',
    tone: 'war',
  },
  {
    id: 'ussr-collapse',
    title: 'Распад СССР',
    startYear: 1991,
    description: '1991',
    tone: 'state',
  },
];

type TimelinePersonRow = {
  id: string;
  kind: 'person';
  person: Person;
  groupLabel: string;
  left: number;
  width: number;
};

type TimelineImportantRow = {
  id: string;
  kind: 'important';
  important: ImportantPerson;
  groupLabel: string;
  left: number;
  width: number;
};

type TimelineRow = TimelinePersonRow | TimelineImportantRow;

type TimelineGroup = {
  id: string;
  label: string;
  rows: TimelineRow[];
};

function toRange(entity: { birthYear?: number; deathYear?: number }, currentYear: number, span: number) {
  const start = entity.birthYear ?? START_YEAR;
  const end = entity.deathYear ?? currentYear;
  return {
    left: Math.max(0, ((start - START_YEAR) / span) * 100),
    width: Math.max(4, ((end - start) / span) * 100),
  };
}

export function TimelineView() {
  const snapshot = useFamilyStore((state) => state.snapshot());
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const showMilestones = useFamilyStore((state) => state.showMilestones);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const [zoom, setZoom] = useState(1);
  const currentYear = new Date().getFullYear();
  const span = currentYear - START_YEAR;

  const groups = useMemo<TimelineGroup[]>(() => {
    const used = new Set<string>();
    const familyGroups = Object.values(snapshot.couples).map((couple) => {
      const partnerA = snapshot.people[couple.partnerAId];
      const partnerB = snapshot.people[couple.partnerBId];
      const people = [partnerA, partnerB, ...couple.childrenIds.map((id) => snapshot.people[id])]
        .filter(Boolean)
        .filter((person) => !person.isDeleted);

      people.forEach((person) => used.add(person.id));

      const rows: TimelineRow[] = people
        .sort((a, b) => (a.birthYear ?? 9999) - (b.birthYear ?? 9999))
        .map((person) => ({
          id: `${couple.id}-${person.id}`,
          kind: 'person',
          person,
          groupLabel: couple.id,
          ...toRange(person, currentYear, span),
        }));

      return {
        id: couple.id,
        label: [partnerA, partnerB].filter(Boolean).map(getFullName).join(' + ') || 'Семейная группа',
        rows,
      };
    });

    const ungroupedRows: TimelineRow[] = activePeople(snapshot)
      .filter((person) => !used.has(person.id))
      .map((person) => ({
        id: `ungrouped-${person.id}`,
        kind: 'person',
        person,
        groupLabel: 'Отдельные профили',
        ...toRange(person, currentYear, span),
      }));

    const importantRows: TimelineRow[] = showImportantPeople
      ? Object.values(snapshot.importantPeople).map((important) => ({
          id: `important-${important.id}`,
          kind: 'important',
          important,
          groupLabel: 'Важные люди',
          ...toRange(important, currentYear, span),
        }))
      : [];

    return [
      ...familyGroups.filter((group) => group.rows.length > 0),
      ...(ungroupedRows.length ? [{ id: 'ungrouped', label: 'Отдельные профили', rows: ungroupedRows }] : []),
      ...(importantRows.length ? [{ id: 'important', label: 'Важные люди', rows: importantRows }] : []),
    ];
  }, [currentYear, showImportantPeople, snapshot, span]);

  const yearTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let year = START_YEAR; year <= currentYear; year += 10) ticks.push(year);
    return ticks;
  }, [currentYear]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="timeline"
        className="tree-surface timeline-surface"
        data-tree-export-root="true"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <div className="timeline-toolbar">
          <div>
            <strong>Таймлайн семьи</strong>
            <span>Группы построены по парам и детям, важные люди вынесены на отдельную дорожку.</span>
          </div>
          <div className="icon-button-group">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.85, value - 0.15))} title="Уменьшить">
              <Minus size={16} />
            </button>
            <button type="button" onClick={() => setZoom((value) => Math.min(2.4, value + 0.15))} title="Увеличить">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="timeline-scroll">
          <div className="timeline-grid timeline-grid-grouped" style={{ width: `${100 * zoom}%` }}>
            <div className="timeline-years">
              {yearTicks.map((year) => (
                <span key={year} style={{ left: `${((year - START_YEAR) / span) * 100}%` }}>
                  {year}
                </span>
              ))}
            </div>
            {yearTicks.map((year) => (
              <i key={year} className="timeline-tick" style={{ left: `${((year - START_YEAR) / span) * 100}%` }} />
            ))}
            {showMilestones && (
              <div className="milestone-layer">
                {historicalMilestones.map((milestone) => {
                  const left = ((milestone.startYear - START_YEAR) / span) * 100;
                  const width = milestone.endYear
                    ? Math.max(0.6, ((milestone.endYear - milestone.startYear) / span) * 100)
                    : 0.4;
                  return (
                    <div
                      key={milestone.id}
                      className={`milestone-band milestone-${milestone.tone}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <strong>{milestone.title}</strong>
                      <span>{milestone.description}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="timeline-groups">
              {groups.map((group) => (
                <section key={group.id} className="timeline-family-group">
                  <header>
                    <strong>{group.label}</strong>
                    <span>{group.rows.length} дорожки</span>
                  </header>
                  <div className="timeline-rows">
                    {group.rows.map((row) =>
                      row.kind === 'person' ? (
                        <PersonTimelineRow
                          key={row.id}
                          row={row}
                          snapshot={snapshot}
                          span={span}
                          onSelect={() => selectPerson(row.person.id)}
                        />
                      ) : (
                        <ImportantTimelineRow key={row.id} row={row} />
                      ),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PersonTimelineRow({
  row,
  snapshot,
  span,
  onSelect,
}: {
  row: TimelinePersonRow;
  snapshot: ReturnType<typeof useFamilyStore.getState>['snapshot'] extends () => infer R ? R : never;
  span: number;
  onSelect: () => void;
}) {
  const events = getEventsForPerson(snapshot, row.person.id).filter((event) => event.date && /^\d{4}/.test(event.date));

  return (
    <button
      type="button"
      className={`timeline-row branch-${row.person.branch ?? 'self'}`}
      onClick={onSelect}
      style={{ ['--bar-left' as string]: `${row.left}%`, ['--bar-width' as string]: `${row.width}%` }}
    >
      <span className="timeline-row-label">
        <strong>{getFullName(row.person)}</strong>
        <small>{row.person.generation === 0 ? 'Поколение 0' : `Поколение ${row.person.generation}`}</small>
      </span>
      <span className="timeline-bar">
        <span className="avatar timeline-avatar">
          {row.person.firstName[0]}
          {row.person.lastName[0]}
        </span>
        <span>{getYears(row.person)}</span>
        <Link to={`/person/${row.person.id}`} onClick={(event) => event.stopPropagation()}>
          Профиль
        </Link>
      </span>
      {events.map((event) => {
        const year = Number(event.date?.slice(0, 4));
        const left = ((year - START_YEAR) / span) * 100;
        return (
          <span key={event.id} className="timeline-event-dot" style={{ left: `${left}%` }} title={event.title}>
            <i />
          </span>
        );
      })}
    </button>
  );
}

function ImportantTimelineRow({ row }: { row: TimelineImportantRow }) {
  return (
    <div
      className="timeline-row timeline-row-important"
      style={{ ['--bar-left' as string]: `${row.left}%`, ['--bar-width' as string]: `${row.width}%` }}
    >
      <span className="timeline-row-label">
        <strong>{getFullName(row.important)}</strong>
        <small>{row.important.relationshipType}</small>
      </span>
      <span className="timeline-bar important-timeline-bar">
        <span className="avatar timeline-avatar">
          {row.important.firstName[0]}
          {row.important.lastName[0]}
        </span>
        <span>{getYears(row.important)}</span>
        <Link to={`/important-person/${row.important.id}`}>Профиль</Link>
      </span>
    </div>
  );
}
