import { Link } from 'react-router-dom';
import { Baby, Heart, Images, Mic, MicOff, Plus, RotateCcw, Trash2, UserRoundPlus, X } from 'lucide-react';
import { useFamilyStore } from '../store/familyStore';
import type { Gender, Person } from '../types/family';
import {
  IMPORTANT_RELATIONS,
  getAge,
  getChildren,
  getFullName,
  getImportantForPerson,
  getParents,
  getSpouses,
  getYears,
} from '../utils/family';
import { stageIcon, stagesForGender } from '../utils/lifeStages';
import { useSpeechToText } from '../hooks/useSpeechToText';
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

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
}) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function PersonEditor() {
  const snapshot = useFamilyStore((state) => state.snapshot());
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectedImportantPersonId = useFamilyStore((state) => state.selectedImportantPersonId);
  const updatePerson = useFamilyStore((state) => state.updatePerson);
  const updateImportantPerson = useFamilyStore((state) => state.updateImportantPerson);
  const softDeleteImportant = useFamilyStore((state) => state.softDeleteImportantPerson);
  const restoreImportant = useFamilyStore((state) => state.restoreImportantPerson);
  const unpairPartners = useFamilyStore((state) => state.unpairPartners);
  const linkPartners = useFamilyStore((state) => state.linkPartners);
  const addParents = useFamilyStore((state) => state.addParents);
  const addSpouse = useFamilyStore((state) => state.addSpouse);
  const addChild = useFamilyStore((state) => state.addChild);
  const addImportantPerson = useFamilyStore((state) => state.addImportantPerson);
  const addLifeEvent = useFamilyStore((state) => state.addLifeEvent);
  const softDeletePerson = useFamilyStore((state) => state.softDeletePerson);
  const restorePerson = useFamilyStore((state) => state.restorePerson);

  const important = selectedImportantPersonId
    ? snapshot.importantPeople[selectedImportantPersonId]
    : undefined;
  const person = snapshot.people[selectedPersonId];

  const bio = useSpeechToText({
    lang: 'ru-RU',
    onResult: (text) => {
      if (!person) return;
      const next = (person.bio ?? '').trim();
      updatePerson(person.id, { bio: next ? next + ' ' + text : text });
    },
  });

  if (important) {
    return (
      <aside className="inspector">
        <div className="inspector-header">
          <div className="avatar">
            {important.firstName[0]}
            {important.lastName[0]}
          </div>
          <div>
            <strong>{getFullName(important)}</strong>
            <span>{important.relationshipType}</span>
          </div>
        </div>
        <div className="form-grid">
          <TextField
            label="Имя"
            value={important.firstName}
            onChange={(firstName) => updateImportantPerson(important.id, { firstName })}
          />
          <TextField
            label="Фамилия"
            value={important.lastName}
            onChange={(lastName) => updateImportantPerson(important.id, { lastName })}
          />
          <TextField
            label="Тип связи"
            value={important.relationshipType}
            onChange={(relationshipType) =>
              updateImportantPerson(important.id, { relationshipType })
            }
          />
          <NumberField
            label="Год рождения"
            value={important.birthYear}
            onChange={(birthYear) => updateImportantPerson(important.id, { birthYear })}
          />
          <label className="wide-label">
            <span>Почему важен</span>
            <textarea
              value={important.importance}
              onChange={(event) =>
                updateImportantPerson(important.id, { importance: event.target.value })
              }
            />
          </label>
        </div>
        <div className="action-grid">
          <Link className="primary-action" to={`/important-person/${important.id}`}>
            Открыть глубокий профиль
          </Link>
          {important.isDeleted ? (
            <button type="button" onClick={() => restoreImportant(important.id)}>
              <RotateCcw size={15} />
              Восстановить
            </button>
          ) : (
            <button
              type="button"
              className="danger-action"
              onClick={() => softDeleteImportant(important.id)}
              title="Удалить (восстановить можно из корзины слева внизу)"
            >
              <X size={15} />
              Удалить
            </button>
          )}
        </div>
      </aside>
    );
  }

  if (!person) return null;

  const parents = getParents(snapshot, person.id);
  const spouses = getSpouses(snapshot, person.id);
  const children = getChildren(snapshot, person.id);
  const importantPeople = getImportantForPerson(snapshot, person.id);
  const couples = Object.values(snapshot.couples).filter(
    (couple) => couple.partnerAId === person.id || couple.partnerBId === person.id,
  );

  const patch = (changes: Partial<Person>) => updatePerson(person.id, changes);

  // When user picks a full date, also keep birthYear in sync for legacy displays.
  const handleBirthDate = (value: string) => {
    const year = /^(\d{4})/.exec(value)?.[1];
    patch({
      birthDate: value || undefined,
      birthYear: year ? Number(year) : person.birthYear,
    });
  };

  const stages = stagesForGender(person.gender);

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="avatar large-avatar">
          {person.firstName[0]}
          {person.lastName[0]}
        </div>
        <div>
          <strong>{getFullName(person)}</strong>
          <span>
            {getYears(person)}
            {getAge(person) ? ` · ${getAge(person)} лет` : ''}
          </span>
        </div>
      </div>

      <div className="inspector-actions">
        <Link className="primary-action" to={`/person/${person.id}`}>
          Открыть профиль
        </Link>
        <Link className="primary-action" to={`/person/${person.id}/gallery`}>
          <Images size={15} />
          Галерея по вехам
        </Link>
        <button
          type="button"
          onClick={() => addLifeEvent({ ownerType: 'person', ownerId: person.id })}
          title="Создать обычное событие без привязки к вехе"
        >
          <Plus size={15} />
          Событие
        </button>
      </div>

      <section className="inspector-stages">
        <small>+ Важный человек (с готовой ролью)</small>
        <div className="stage-chip-row">
          {IMPORTANT_RELATIONS.map((rel) => (
            <button
              key={rel.key}
              type="button"
              title={`Добавить ${rel.label.toLowerCase()} (запись в «Важных людях»)`}
              onClick={() =>
                addImportantPerson(
                  { type: 'person', id: person.id },
                  {
                    firstName: rel.label,
                    lastName: person.lastName,
                    relationshipType: rel.key,
                    importance: `${rel.label} ${getFullName(person)}.`,
                  },
                )
              }
            >
              <span aria-hidden>{rel.icon}</span> {rel.label}
            </button>
          ))}
        </div>
      </section>

      {couples.length > 0 && (
        <section className="inspector-stages">
          <small>Супруги (связи)</small>
          <ul className="couples-list">
            {couples.map((couple) => {
              const otherId =
                couple.partnerAId === person.id ? couple.partnerBId : couple.partnerAId;
              const other = snapshot.people[otherId];
              return (
                <li key={couple.id}>
                  <span>
                    ↔ <strong>{other ? getFullName(other) : '—'}</strong>
                  </span>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => {
                      if (
                        confirm(
                          'Расторгнуть эту пару? Дети окажутся без привязки к родителям — это можно изменить позже.',
                        )
                      ) {
                        unpairPartners(couple.id);
                      }
                    }}
                    title="Расторгнуть пару"
                  >
                    Расторгнуть
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="inspector-stages">
        <small>Связать существующих супругов</small>
        <select
          defaultValue=""
          onChange={(event) => {
            const partnerBId = event.target.value;
            if (!partnerBId) return;
            linkPartners(person.id, partnerBId);
            event.target.value = '';
          }}
        >
          <option value="">Выбрать супруга из дерева…</option>
          {Object.values(snapshot.people)
            .filter(
              (p) =>
                !p.isDeleted &&
                p.id !== person.id &&
                !couples.some(
                  (c) =>
                    (c.partnerAId === person.id && c.partnerBId === p.id) ||
                    (c.partnerBId === person.id && c.partnerAId === p.id),
                ),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {getFullName(p)}
              </option>
            ))}
        </select>
      </section>

      <section className="inspector-stages">
        <small>Добавить веху жизни</small>
        <div className="stage-chip-row">
          {stages.map((stage) => (
            <button
              key={stage.key}
              type="button"
              title={stage.description}
              onClick={() =>
                addLifeEvent(
                  { ownerType: 'person', ownerId: person.id },
                  { type: stage.defaultEventType, title: stage.title },
                )
              }
            >
              <span aria-hidden>{stageIcon(stage.key)}</span> {stage.title}
            </button>
          ))}
        </div>
      </section>

      <div className="form-grid">
        <TextField
          label="Имя"
          value={person.firstName}
          onChange={(firstName) => patch({ firstName })}
        />
        <TextField
          label="Отчество"
          value={person.patronymic}
          onChange={(patronymic) => patch({ patronymic: patronymic || undefined })}
        />
        <TextField
          label="Фамилия"
          value={person.lastName}
          onChange={(lastName) => patch({ lastName })}
        />
        {person.gender === 'female' && (
          <TextField
            label="Девичья фамилия"
            value={person.maidenName}
            onChange={(maidenName) => patch({ maidenName: maidenName || undefined })}
          />
        )}
        <label>
          <span>Пол</span>
          <select
            value={person.gender}
            onChange={(event) => patch({ gender: event.target.value as Gender })}
          >
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </label>
        <NumberField
          label="Год рождения"
          value={person.birthYear}
          onChange={(birthYear) => patch({ birthYear })}
        />
        <TextField
          label="Дата рождения (полная)"
          type="date"
          value={person.birthDate}
          onChange={handleBirthDate}
        />
        <NumberField
          label="Год смерти"
          value={person.deathYear}
          onChange={(deathYear) => patch({ deathYear })}
        />
        <label className="wide-label">
          <span>
            Биография
            {bio.supported && (
              <button
                type="button"
                className={`mic-toggle${bio.isRecording ? ' mic-active' : ''}`}
                onClick={() => (bio.isRecording ? bio.stop() : bio.start())}
                title={bio.isRecording ? 'Остановить запись' : 'Надиктовать голосом (ru-RU)'}
              >
                {bio.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                {bio.isRecording ? 'Слушаю…' : 'Голос'}
              </button>
            )}
          </span>
          <textarea
            value={person.bio ?? ''}
            onChange={(event) => patch({ bio: event.target.value })}
          />
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
          <button
            type="button"
            className="danger-action"
            onClick={() => softDeletePerson(person.id)}
          >
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
