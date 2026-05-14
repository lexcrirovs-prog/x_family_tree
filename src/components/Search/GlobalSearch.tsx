import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Calendar, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import type { LifeEvent, Person } from '../../types/family';
import { eventIcon, getFullName, getYears } from '../../utils/family';

type EventHit = LifeEvent & { ownerPerson?: Person };

export function GlobalSearch() {
  const people = useFamilyStore((state) => state.people);
  const events = useFamilyStore((state) => state.events);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const peopleFuse = useMemo(
    () =>
      new Fuse(
        Object.values(people).filter((p) => !p.isDeleted),
        {
          keys: ['firstName', 'patronymic', 'lastName', 'maidenName', 'bio'],
          threshold: 0.35,
        },
      ),
    [people],
  );

  const eventsFuse = useMemo(() => {
    const hits: EventHit[] = Object.values(events).map((event) => ({
      ...event,
      ownerPerson:
        event.ownerType === 'person'
          ? people[event.ownerId]
          : undefined,
    }));
    return new Fuse(hits, {
      keys: ['title', 'description', 'date', 'location'],
      threshold: 0.4,
    });
  }, [events, people]);

  const trimmed = query.trim();
  const peopleResults = trimmed ? peopleFuse.search(trimmed).slice(0, 5).map((r) => r.item) : [];
  const eventResults = trimmed ? eventsFuse.search(trimmed).slice(0, 4).map((r) => r.item) : [];
  const hasResults = peopleResults.length + eventResults.length > 0;

  return (
    <div className="global-search">
      <Search size={16} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск по имени, отчеству, событиям…"
        aria-label="Глобальный поиск"
      />
      {hasResults && (
        <div className="search-popover">
          {peopleResults.length > 0 && (
            <>
              <div className="search-group-head">Люди</div>
              {peopleResults.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  onClick={() => {
                    selectPerson(person.id);
                    setFocusedPerson(person.id);
                    setQuery('');
                    navigate('/');
                  }}
                >
                  <span className="avatar small-avatar">
                    {person.firstName[0]}
                    {person.lastName[0]}
                  </span>
                  <span>
                    <strong>{getFullName(person)}</strong>
                    <small>{getYears(person)}</small>
                  </span>
                </button>
              ))}
            </>
          )}
          {eventResults.length > 0 && (
            <>
              <div className="search-group-head">События</div>
              {eventResults.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    setQuery('');
                    if (event.ownerType === 'person' && event.ownerPerson) {
                      navigate(`/person/${event.ownerPerson.id}/gallery`);
                    }
                  }}
                  disabled={event.ownerType !== 'person' || !event.ownerPerson}
                >
                  <span className="avatar small-avatar event-search-icon">
                    {eventIcon(event.type)}
                  </span>
                  <span>
                    <strong>{event.title}</strong>
                    <small>
                      <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                      {[event.date, event.ownerPerson && getFullName(event.ownerPerson)]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </small>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
