import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import {
  activePeople,
  eventIcon,
  generationLabel,
  getEventsForPerson,
  getFullName,
  getYears,
  personMatchesSurname,
} from '../../utils/family';
import type { LifeEvent } from '../../types/family';

const START_YEAR = 1800;

function parseEventYear(event: LifeEvent): number | undefined {
  if (!event.date) return undefined;
  const match = /(\d{4})/.exec(event.date);
  return match ? Number(match[1]) : undefined;
}

export function TimelineView() {
  const snapshot = useFamilyStore((state) => state.snapshot());
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const surnameFilter = useFamilyStore((state) => state.surnameFilter);
  const surnameFilterMode = useFamilyStore((state) => state.surnameFilterMode);
  const [zoom, setZoom] = useState(1);
  const currentYear = new Date().getFullYear();
  const span = currentYear - START_YEAR;

  const surnameActive = Boolean(surnameFilter) && surnameFilterMode !== 'off';

  const rows = useMemo(
    () =>
      activePeople(snapshot)
        .map((person) => {
          const matches = surnameFilter ? personMatchesSurname(person, surnameFilter) : true;
          return { person, matches };
        })
        .filter(({ matches }) => !(surnameFilterMode === 'only' && !matches))
        .sort(
          (a, b) =>
            a.person.generation - b.person.generation ||
            (a.person.birthYear ?? 9999) - (b.person.birthYear ?? 9999),
        )
        .map(({ person, matches }) => {
          const start = person.birthYear ?? START_YEAR;
          const end = person.deathYear ?? currentYear;
          const markers = getEventsForPerson(snapshot, person.id)
            .map((event) => {
              const year = parseEventYear(event);
              if (!year) return null;
              return {
                event,
                left: ((year - start) / Math.max(1, end - start)) * 100,
              };
            })
            .filter(Boolean) as Array<{ event: LifeEvent; left: number }>;
          return {
            person,
            matches,
            left: Math.max(0, ((start - START_YEAR) / span) * 100),
            width: Math.max(4, ((end - start) / span) * 100),
            markers,
          };
        }),
    [currentYear, snapshot, span, surnameFilter, surnameFilterMode],
  );

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <div className="timeline-toolbar">
          <div>
            <strong>Таймлайн жизни</strong>
            <span>Горизонтальный зум по времени, дорожки сгруппированы по поколениям</span>
          </div>
          <div className="icon-button-group">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))}
              title="Уменьшить"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))}
              title="Увеличить"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="timeline-scroll">
          <div className="timeline-grid" style={{ width: `${100 * zoom}%` }}>
            <div className="timeline-years">
              {yearTicks.map((year) => (
                <span
                  key={year}
                  style={{ left: `${((year - START_YEAR) / span) * 100}%` }}
                >
                  {year}
                </span>
              ))}
            </div>
            {yearTicks.map((year) => (
              <i
                key={year}
                className="timeline-tick"
                style={{ left: `${((year - START_YEAR) / span) * 100}%` }}
              />
            ))}
            <div className="timeline-rows">
              {rows.map(({ person, left, width, markers, matches }) => (
                <button
                  key={person.id}
                  type="button"
                  className={`timeline-row branch-${person.branch ?? 'self'}${
                    surnameActive && !matches ? ' timeline-row-muted' : ''
                  }`}
                  onClick={() => selectPerson(person.id)}
                  style={{
                    ['--bar-left' as string]: `${left}%`,
                    ['--bar-width' as string]: `${width}%`,
                  }}
                >
                  <span className="timeline-row-label">
                    <strong>{getFullName(person)}</strong>
                    <small>{generationLabel(person.generation)}</small>
                  </span>
                  <span className="timeline-bar">
                    <span className="avatar timeline-avatar">
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </span>
                    <span>{getYears(person)}</span>
                    <Link
                      to={`/person/${person.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Профиль
                    </Link>
                    {markers.map(({ event, left: ml }) => (
                      <span
                        key={event.id}
                        className={`timeline-marker timeline-marker-${event.type}`}
                        style={{ left: `${Math.min(100, Math.max(0, ml))}%` }}
                        title={`${event.title}${event.date ? ' · ' + event.date : ''}`}
                      >
                        {event.type === 'childBirth' ? '👶' : eventIcon(event.type)}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
