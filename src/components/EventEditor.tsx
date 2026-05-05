import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store/store';
import type { LifeEventType } from '../types';

const TYPES: Array<{ k: LifeEventType; label: string; icon: string }> = [
  { k: 'birth', label: 'Рождение', icon: '👶' },
  { k: 'marriage', label: 'Свадьба', icon: '💍' },
  { k: 'childBirth', label: 'Рождение ребёнка', icon: '🍼' },
  { k: 'death', label: 'Смерть', icon: '🕯️' },
  { k: 'education', label: 'Образование', icon: '🎓' },
  { k: 'work', label: 'Работа', icon: '💼' },
  { k: 'move', label: 'Переезд', icon: '🏠' },
  { k: 'achievement', label: 'Достижение', icon: '🏆' },
  { k: 'meeting', label: 'Знакомство', icon: '🤝' },
  { k: 'travel', label: 'Поездка', icon: '✈️' },
  { k: 'custom', label: 'Своё', icon: '⭐' },
];

export function EventEditor({
  open, onClose, ownerId, ownerType,
}: {
  open: boolean; onClose: () => void; ownerId: string; ownerType: 'person' | 'couple';
}) {
  const [type, setType] = useState<LifeEventType>('custom');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [childName, setChildName] = useState('');

  const people = useStore((s) => s.people);
  const addEvent = useStore((s) => s.addEvent);
  const addPerson = useStore((s) => s.addPerson);
  const addCouple = useStore((s) => s.addCouple);
  const attachChild = useStore((s) => s.attachChild);
  const updatePerson = useStore((s) => s.updatePerson);
  const couples = useStore((s) => s.couples);
  const snapshot = useStore((s) => s.snapshot);

  const peopleList = useMemo(() => Object.values(people).filter((p) => !p.isDeleted), [people]);

  const reset = () => {
    setType('custom'); setTitle(''); setDate(''); setLocation('');
    setDescription(''); setLinkedIds([]); setChildName('');
  };

  const submit = () => {
    if (!title) return;
    snapshot(`add-event-${type}`);

    addEvent({
      ownerId, ownerType, type, title,
      date: date || undefined,
      location: location || undefined,
      description: description || undefined,
      linkedEntities: linkedIds.map((id) => ({ type: 'person' as const, id })),
    });

    // Automation
    if (type === 'childBirth' && ownerType === 'couple' && childName.trim()) {
      const year = date ? Number(date.slice(0, 4)) : undefined;
      const childId = addPerson({ firstName: childName.trim(), gender: 'male', birthYear: year });
      attachChild(ownerId, childId);
      addEvent({
        ownerId: childId, ownerType: 'person', type: 'birth',
        title: `Рождение ${childName}`, date,
        linkedEntities: [{ type: 'couple', id: ownerId, role: 'родители' }],
      });
    }
    if (type === 'marriage' && ownerType === 'person' && linkedIds.length === 1) {
      // ensure couple
      const partnerId = linkedIds[0];
      const existing = Object.values(couples).find(
        (c) => !c.isDeleted && (
          (c.partnerAId === ownerId && c.partnerBId === partnerId) ||
          (c.partnerBId === ownerId && c.partnerAId === partnerId)
        )
      );
      const year = date ? Number(date.slice(0, 4)) : undefined;
      if (!existing) addCouple(ownerId, partnerId, year);
    }
    if (type === 'death' && ownerType === 'person' && date) {
      const year = Number(date.slice(0, 4));
      if (!Number.isNaN(year)) updatePerson(ownerId, { deathYear: year });
    }

    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Новое событие" wide>
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.k}
            onClick={() => { setType(t.k); if (!title) setTitle(t.label); }}
            className="rounded-lg border px-3 py-2 text-left text-sm"
            style={{
              background: type === t.k ? 'var(--color-accent)' : 'var(--color-bg-2)',
              color: type === t.k ? '#fff' : 'inherit',
              borderColor: 'var(--color-border)',
            }}
          >
            <span className="mr-2">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm">
          <span className="opacity-70">Заголовок</span>
          <input className="w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="opacity-70">Дата (YYYY-MM-DD или YYYY)</span>
          <input className="w-full" placeholder="1985-06-12 или 1985" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="opacity-70">Место</span>
          <input className="w-full" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="col-span-2 text-sm">
          <span className="opacity-70">Описание</span>
          <textarea className="w-full" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="col-span-2 text-sm">
          <span className="opacity-70">Связанные люди</span>
          <select multiple className="w-full" value={linkedIds}
                  onChange={(e) => setLinkedIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                  style={{ height: 120 }}>
            {peopleList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} {p.birthYear ? `(${p.birthYear})` : ''}
              </option>
            ))}
          </select>
        </label>
        {type === 'childBirth' && ownerType === 'couple' && (
          <label className="col-span-2 text-sm">
            <span className="opacity-70">Имя ребёнка (создастся профиль)</span>
            <input className="w-full" value={childName} onChange={(e) => setChildName(e.target.value)} />
          </label>
        )}
      </div>

      <div className="mt-4 text-right">
        <button
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-accent)' }}
          onClick={submit}
        >Создать событие</button>
      </div>
    </Modal>
  );
}
