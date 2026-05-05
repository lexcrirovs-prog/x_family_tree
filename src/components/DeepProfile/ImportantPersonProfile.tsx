import { Link, useParams } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import { getFullName, getYears } from '../../utils/family';
import { Breadcrumbs } from '../layout/Breadcrumbs';

export function ImportantPersonProfile() {
  const { id } = useParams();
  const snapshot = useFamilyStore((state) => state.snapshot());
  const important = id ? snapshot.importantPeople[id] : undefined;

  if (!important) {
    return (
      <main className="profile-page">
        <Breadcrumbs items={[{ label: 'Важный человек не найден' }]} />
        <div className="empty-state">
          Профиль не найден. <Link to="/">Вернуться к дереву</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <Breadcrumbs items={[{ label: getFullName(important) }]} />
      <header className="profile-header">
        <div className="profile-avatar important-profile-avatar">{important.firstName[0]}{important.lastName[0]}</div>
        <div>
          <h1>{getFullName(important)}</h1>
          <p>{important.relationshipType} · {getYears(important)}</p>
          <span>{important.importance}</span>
        </div>
      </header>
      <div className="profile-grid">
        <section className="profile-main">
          <h2>История связи</h2>
          <p className="profile-copy">{important.bio || 'Добавьте биографию и события, чтобы показать роль этого человека в семейной истории.'}</p>
        </section>
        <aside className="profile-side">
          <section>
            <h3>Связан с членами семьи</h3>
            {important.linkedTo.map((link) => {
              if (link.type === 'person') {
                const person = snapshot.people[link.id];
                return person ? (
                  <Link key={link.id} to={`/person/${person.id}`}>
                    {getFullName(person)}
                  </Link>
                ) : null;
              }
              const couple = snapshot.couples[link.id];
              return couple ? <span key={link.id}>Пара {link.id}</span> : null;
            })}
          </section>
        </aside>
      </div>
    </main>
  );
}

