import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import { getFullName, getYears } from '../../utils/family';

export function GlobalSearch() {
  const people = useFamilyStore((state) => state.people);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const fuse = useMemo(
    () =>
      new Fuse(Object.values(people).filter((person) => !person.isDeleted), {
        keys: ['firstName', 'lastName', 'maidenName', 'bio'],
        threshold: 0.35,
      }),
    [people],
  );

  const results = query.trim() ? fuse.search(query.trim()).slice(0, 6).map((result) => result.item) : [];

  return (
    <div className="global-search">
      <Search size={16} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" aria-label="Поиск по имени" />
      {results.length > 0 && (
        <div className="search-popover">
          {results.map((person) => (
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
              <span className="avatar small-avatar">{person.firstName[0]}{person.lastName[0]}</span>
              <span>
                <strong>{getFullName(person)}</strong>
                <small>{getYears(person)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

