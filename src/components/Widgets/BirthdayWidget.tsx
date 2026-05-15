import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cake } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import type { Person } from '../../types/family';
import { getFullName } from '../../utils/family';

function parsePersonBirthday(person: Person): { month: number; day: number } | undefined {
  if (person.birthDate) {
    // accept YYYY-MM-DD or DD.MM.YYYY
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(person.birthDate);
    if (iso) return { month: Number(iso[2]), day: Number(iso[3]) };
    const eu = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(person.birthDate);
    if (eu) return { month: Number(eu[2]), day: Number(eu[1]) };
  }
  return undefined;
}

type Entry = {
  person: Person;
  daysUntil: number;
  age?: number;
};

export function BirthdayWidget() {
  const people = useFamilyStore((s) => s.people);
  const [open, setOpen] = useState(false);

  const entries: Entry[] = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const results: Entry[] = [];
    for (const person of Object.values(people)) {
      if (person.isDeleted) continue;
      const bd = parsePersonBirthday(person);
      if (!bd) continue;
      // build this year's date; if already past, take next year
      let target = new Date(now.getFullYear(), bd.month - 1, bd.day);
      if (target < today) target = new Date(now.getFullYear() + 1, bd.month - 1, bd.day);
      const daysUntil = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 14) continue;
      const age = person.birthYear ? target.getFullYear() - person.birthYear : undefined;
      results.push({ person, daysUntil, age });
    }
    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [people]);

  const todayCount = entries.filter((e) => e.daysUntil === 0).length;
  if (entries.length === 0) return null;

  return (
    <div className="birthday-widget">
      <button
        type="button"
        className={`toolbar-button birthday-trigger${todayCount ? ' birthday-today' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Ближайшие дни рождения"
      >
        <Cake size={16} />
        <span>{todayCount > 0 ? `Сегодня ${todayCount}` : `${entries.length}`}</span>
      </button>
      {open && (
        <div className="birthday-popover">
          <strong>Дни рождения на 2 недели вперёд</strong>
          <ul>
            {entries.map(({ person, daysUntil, age }) => (
              <li key={person.id}>
                <Link to={`/person/${person.id}`} onClick={() => setOpen(false)}>
                  {getFullName(person)}
                </Link>
                <small>
                  {daysUntil === 0
                    ? `Сегодня${age ? ` · ${age} лет` : ''}`
                    : daysUntil === 1
                    ? `Завтра${age ? ` · ${age} лет` : ''}`
                    : `Через ${daysUntil} дн.${age ? ` · ${age} лет` : ''}`}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
