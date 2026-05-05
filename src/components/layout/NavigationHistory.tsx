import { Link } from 'react-router-dom';
import { Clock3, TreePine } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getInitials } from '../../utils/family';

export function NavigationHistory() {
  const people = useFamilyStore((state) => state.people);
  const recentPersonIds = useFamilyStore((state) => state.recentPersonIds);

  return (
    <nav className="history-rail" aria-label="Недавно открытые">
      <Link to="/" className="rail-logo" title="Дерево">
        <TreePine size={18} />
      </Link>
      <Clock3 size={15} className="rail-muted" />
      {recentPersonIds.map((id) => {
        const person = people[id];
        if (!person) return null;
        return (
          <Link key={id} to={`/person/${id}`} title={`${person.firstName} ${person.lastName}`}>
            {getInitials(person)}
          </Link>
        );
      })}
    </nav>
  );
}

