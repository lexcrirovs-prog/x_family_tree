import { Link } from 'react-router-dom';
import type { FamilySnapshot, Person } from '../../types/family';
import { getChildren, getFullName, getImportantForPerson, getMentions, getParents, getSiblings, getSpouses } from '../../utils/family';

type RelationsBlockProps = {
  snapshot: FamilySnapshot;
  person: Person;
};

export function RelationsBlock({ snapshot, person }: RelationsBlockProps) {
  const sections = [
    { title: 'Родители', people: getParents(snapshot, person.id) },
    { title: 'Супруги', people: getSpouses(snapshot, person.id) },
    { title: 'Дети', people: getChildren(snapshot, person.id) },
    { title: 'Братья/сёстры', people: getSiblings(snapshot, person.id) },
  ];
  const important = getImportantForPerson(snapshot, person.id);
  const mentions = getMentions(snapshot, person.id);

  return (
    <aside className="profile-side">
      {sections.map((section) =>
        section.people.length > 0 ? (
          <section key={section.title}>
            <h3>{section.title}</h3>
            {section.people.map((item) => (
              <Link key={item.id} to={`/person/${item.id}`}>
                {getFullName(item)}
              </Link>
            ))}
          </section>
        ) : null,
      )}
      <section>
        <h3>Важные люди</h3>
        {important.length === 0 ? (
          <span className="muted-copy">Пока нет связей.</span>
        ) : (
          important.map((item) => (
            <Link key={item.id} to={`/important-person/${item.id}`}>
              {getFullName(item)}
            </Link>
          ))
        )}
      </section>
      <section>
        <h3>Где ещё упоминается</h3>
        {mentions.length === 0 ? (
          <span className="muted-copy">Упоминаний пока нет.</span>
        ) : (
          mentions.map((mention) => <span key={`${mention.type}-${mention.id}`}>{mention.label}</span>)
        )}
      </section>
    </aside>
  );
}

