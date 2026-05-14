import { useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { personMatchesSurname, uniqueSurnames } from '../../utils/family';

export function SurnameFilter() {
  const people = useFamilyStore((s) => s.people);
  const couples = useFamilyStore((s) => s.couples);
  const importantPeople = useFamilyStore((s) => s.importantPeople);
  const events = useFamilyStore((s) => s.events);
  const media = useFamilyStore((s) => s.media);
  const surname = useFamilyStore((s) => s.surnameFilter);
  const mode = useFamilyStore((s) => s.surnameFilterMode);
  const setSurname = useFamilyStore((s) => s.setSurnameFilter);
  const setMode = useFamilyStore((s) => s.setSurnameFilterMode);
  const clear = useFamilyStore((s) => s.clearSurnameFilter);
  const [open, setOpen] = useState(false);

  const surnames = useMemo(
    () => uniqueSurnames({ people, couples, importantPeople, events, media }),
    [couples, events, importantPeople, media, people],
  );

  const matchCount = useMemo(() => {
    if (!surname) return 0;
    return Object.values(people).filter((p) => !p.isDeleted && personMatchesSurname(p, surname))
      .length;
  }, [people, surname]);

  const active = surname && mode !== 'off';

  return (
    <div className={`surname-filter${active ? ' surname-filter-active' : ''}`}>
      <button
        type="button"
        className="toolbar-button"
        onClick={() => setOpen((v) => !v)}
        title="Выделить или показать только одну ветвь по фамилии"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Filter size={16} />
        <span>{active ? `${surname} · ${matchCount}` : 'Фамилия'}</span>
        {active && (
          <span
            className="surname-clear"
            onClick={(e) => {
              e.stopPropagation();
              clear();
              setOpen(false);
            }}
            role="button"
            aria-label="Сбросить фильтр"
          >
            <X size={12} />
          </span>
        )}
      </button>
      {open && (
        <div className="surname-popover" role="dialog" aria-label="Фильтр по фамилии">
          <div className="surname-modes">
            <button
              type="button"
              className={mode === 'highlight' ? 'mode-button-active' : ''}
              onClick={() => setMode('highlight')}
            >
              Выделить
            </button>
            <button
              type="button"
              className={mode === 'only' ? 'mode-button-active' : ''}
              onClick={() => setMode('only')}
            >
              Только эти
            </button>
            <button
              type="button"
              className={mode === 'off' ? 'mode-button-active' : ''}
              onClick={() => clear()}
            >
              Сбросить
            </button>
          </div>
          <ul className="surname-list" role="listbox">
            {surnames.length === 0 && <li className="muted-copy">Фамилий пока нет.</li>}
            {surnames.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={surname === s ? 'surname-active' : ''}
                  onClick={() => {
                    setSurname(s);
                    if (mode === 'off') setMode('highlight');
                    setOpen(false);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
