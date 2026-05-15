import { Link } from 'react-router-dom';
import type { FamilySnapshot, LifeEvent } from '../../types/family';
import { eventIcon, getFullName } from '../../utils/family';

type LifeTimelineProps = {
  events: LifeEvent[];
  snapshot: FamilySnapshot;
};

export function LifeTimeline({ events, snapshot }: LifeTimelineProps) {
  if (events.length === 0) {
    return <div className="empty-state">События пока не добавлены. Начните с рождения, переезда или важной встречи.</div>;
  }

  return (
    <div className="life-timeline">
      {events.map((event) => (
        <article key={event.id} className={`event-card event-card-${event.type}`}>
          <div className="event-icon">
            {event.type === 'childBirth' ? '👶' : eventIcon(event.type)}
          </div>
          <div>
            <header>
              <strong>{event.title}</strong>
              <span>{[event.date, event.location].filter(Boolean).join(' · ')}</span>
            </header>
            {event.description && <p>{event.description}</p>}
            {event.linkedEntities.length > 0 && (
              <div className="linked-entities">
                {event.linkedEntities.map((entity) => {
                  if (entity.type === 'person') {
                    const person = snapshot.people[entity.id];
                    if (!person) return null;
                    return (
                      <Link key={`${event.id}-${entity.id}`} to={`/person/${person.id}`}>
                        {getFullName(person)}
                      </Link>
                    );
                  }
                  if (entity.type === 'importantPerson') {
                    const important = snapshot.importantPeople[entity.id];
                    if (!important) return null;
                    return (
                      <Link key={`${event.id}-${entity.id}`} to={`/important-person/${important.id}`}>
                        {getFullName(important)}
                      </Link>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

