import { Link } from 'react-router-dom';
import { Baby, Heart, Plus, RotateCcw, Trash2, UserRoundPlus } from 'lucide-react';
import { useFamilyStore } from '../store/familyStore';
import type { Gender, Person } from '../types/family';
import { getAge, getChildren, getFullName, getImportantForPerson, getParents, getSpouses, getYears } from '../utils/family';
import { MediaUploader } from './Media/MediaUploader';

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function PersonEditor() {
  const snapshot = useFamilyStore((state) => state.snapshot());
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectedImportantPersonId = useFamilyStore((state) => state.selectedImportantPersonId);
  const updatePerson = useFamilyStore((state) => state.updatePerson);
  const updateImportantPerson = useFamilyStore((state) => state.updateImportantPerson);
  const addParents = useFamilyStore((state) => state.addParents);
  const addSpouse = useFamilyStore((state) => state.addSpouse);
  const addChild = useFamilyStore((state) => state.addChild);
  const addImportantPerson = useFamilyStore((state) => state.addImportantPerson);
  const addLifeEvent = useFamilyStore((state) => state.addLifeEvent);
  const softDeletePerson = useFamilyStore((state) => state.softDeletePerson);
  const restorePerson = useFamilyStore((state) => state.restorePerson);

  const important = selectedImportantPersonId ? snapshot.importantPeople[selectedImportantPersonId] : undefined;
  const person = snapshot.people[selectedPersonId];

  if (important) {
    return (
      <aside className="inspector">
        <div className="inspector-header">
          <div className="avatar">{important.firstName[0]}{important.lastName[0]}</div>
          <div>
            <strong>{getFullName(important)}</strong>
            <span>{important.relationshipType}</span>
          </div>
        </div>
        <div className="form-grid">
          <TextField label="Имя" value={important.firstName} onChange={(firstName) => updateImportantPerson(important.id, { firstName })} />
          <TextField label="Фамилия" value={important.lastName} onChange={(lastName) => updateImportantPerson(important.id, { lastName })} />
          <TextField
            label="Тип связи"
            value={important.relationshipType}
            onChange={(relationshipType) => updateImportantPerson(important.id, { relationshipType })}
          />
          <NumberField label="Год рождения" value={important.birthYear} onChange={(birthYear) => updateImportantPerson(important.id, { birthYear })} />
          <label className="wide-label">
            <span>Почему важен</span>
            <textarea value={important.importance} onChange={(event) => updateImportantPerson(important.id, { importance: event.target.value })} />
          </label>
        </div>
        <Link className="primary-action" to={`/important-person/${important.id}`}>
          Открыть глубокий профиль
        </Link>
      </aside>
    );
  }

  if (!person) return null;

  const parents = getParents(snapshot, person.id);
  const spouses = getSpouses(snapshot, person.id);
  const children = getChildren(snapshot, person.id);
  const importantPeople = getImportantForPerson(snapshot, person.id);
  const couples = Object.values(snapshot.couples).filter((couple) => couple.partnerAId === person.id || couple.partnerBId === person.id);

  const patch = (changes: Partial<Person>) => updatePerson(person.id, changes);

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="avatar large-avatar">{person.firstName[0]}{person.lastName[0]}</div>
        <div>
          <strong>{getFullName(person)}</strong>
          <span>{getYears(person)}{getAge(person) ? ` · ${getAge(person)} лет` : ''}</span>
        </div>
      </div>

      <div className="inspector-actions">
        <Link className="primary-action" to={`/person/${person.id}`}>
          Открыть профиль
        </Link>
        <button type="button" onClick={() => addLifeEvent({ ownerType: 'person', ownerId: person.id })}>
          <Plus size={15} />
          Событие
        </button>
      </div>

      <div className="form-grid">
        <TextField label="Имя" value={person.firstName} onChange={(firstName) => patch({ firstName })} />
        <TextField
          label="Отчество"
          value={person.patronymic}
          onChange={(patronymic) => patch({ patronymic: patronymic || undefined })}
        />
        <TextField label="Фамилия" value={person.lastName} onChange={(lastName) => patch({ lastName })} />
        {person.gender === 'female' && (
          <TextField
            label="Девичья фамилия"
            value={person.maidenName}
            onChange={(maidenName) => patch({ maidenName: maidenName || undefined })}
          />
        )}
        <label>
          <span>Пол</span>
          <select value={person.gender} onChange={(event) => patch({ gender: event.target.value as Gender })}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </label>
        <NumberField label="Год рождения" value={person.birthYear} onChange={(birthYear) => patch({ birthYear })} />
        <NumberField label="Год смерти" value={person.deathYear} onChange={(deathYear) => patch({ deathYear })} />
        <label className="wide-label">
          <span>Биография</span>
          <textarea value={person.bio ?? ''} onChange={(event) => patch({ bio: event.target.value })} />
        </label>
      </div>

      <div className="action-grid">
        {!person.parentCoupleId && (
          <button type="button" onClick={() => addParents(person.id)}>
            <UserRoundPlus size={15} />
            Добавить родителей
          </button>
        )}
        {person.generation >= 0 && (
          <button type="button" onClick={() => addSpouse(person.id)}>
            <Heart size={15} />
            Добавить супруга/у
          </button>
        )}
        {couples.map((couple) => (
          <button key={couple.id} type="button" onClick={() => addChild(couple.id)}>
            <Baby size={15} />
            Добавить ребёнка
          </button>
        ))}
        <button type="button" onClick={() => addImportantPerson({ type: 'person', id: person.id })}>
          <Plus size={15} />
          Важные люди
        </button>
        {person.isDeleted ? (
          <button type="button" onClick={() => restorePerson(person.id)}>
            <RotateCcw size={15} />
            Восстановить
          </button>
        ) : (
          <button type="button" className="danger-action" onClick={() => softDeletePerson(person.id)}>
            <Trash2 size={15} />
            Soft delete
          </button>
        )}
      </div>

      <section className="relation-list">
        <h3>Связи</h3>
        <RelationGroup title="Родители" people={parents} />
        <RelationGroup title="Супруги" people={spouses} />
        <RelationGroup title="Дети" people={children} />
        {importantPeople.length > 0 && (
          <div>
            <small>Важные люди</small>
            {importantPeople.map((item) => (
              <Link key={item.id} to={`/important-person/${item.id}`}>
                {getFullName(item)}
              </Link>
            ))}
          </div>
        )}
      </section>

      <MediaUploader ownerId={person.id} />
    </aside>
  );
}

function RelationGroup({ title, people }: { title: string; people: Person[] }) {
  if (people.length === 0) return null;
  return (
    <div>
      <small>{title}</small>
      {people.map((person) => (
        <Link key={person.id} to={`/person/${person.id}`}>
          {getFullName(person)}
        </Link>
      ))}
    </div>
  );
}

