import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store/store';
import type { Person } from '../types';
import { MediaUploader } from './MediaUploader';
import { Avatar } from './Avatar';
import { Link } from 'react-router-dom';

export function PersonEditor({ personId, onClose }: { personId?: string; onClose: () => void }) {
  const person = useStore((s) => (personId ? s.people[personId] : undefined));
  const updatePerson = useStore((s) => s.updatePerson);
  const softDelete = useStore((s) => s.softDeletePerson);
  const snapshot = useStore((s) => s.snapshot);
  const [draft, setDraft] = useState<Person | undefined>(person);

  useEffect(() => { setDraft(person); }, [person]);

  if (!person || !draft) return null;

  const save = () => {
    snapshot(`edit-person-${person.id}`);
    updatePerson(person.id, draft);
    onClose();
  };

  return (
    <Modal open={!!personId} onClose={onClose} title="Редактирование человека">
      <div className="flex items-start gap-4">
        <Avatar photoId={draft.photoIds[0]} name={`${draft.firstName} ${draft.lastName}`} gender={draft.gender} size={72} />
        <div className="flex-1 grid grid-cols-2 gap-3">
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Имя</span>
            <input className="w-full" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          </label>
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Фамилия</span>
            <input className="w-full" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          </label>
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Девичья фамилия</span>
            <input className="w-full" value={draft.maidenName ?? ''} onChange={(e) => setDraft({ ...draft, maidenName: e.target.value || undefined })} />
          </label>
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Пол</span>
            <select className="w-full" value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value as 'male' | 'female' })}>
              <option value="male">мужской</option>
              <option value="female">женский</option>
            </select>
          </label>
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Год рождения</span>
            <input type="number" className="w-full" value={draft.birthYear ?? ''}
                   onChange={(e) => setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
          <label className="col-span-1 text-sm">
            <span className="opacity-70">Год смерти</span>
            <input type="number" className="w-full" value={draft.deathYear ?? ''}
                   onChange={(e) => setDraft({ ...draft, deathYear: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
        </div>
      </div>

      <label className="mt-4 block text-sm">
        <span className="opacity-70">Биография (Markdown)</span>
        <textarea className="w-full" rows={4} value={draft.bio ?? ''} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
      </label>

      <div className="mt-4">
        <div className="mb-2 text-sm opacity-70">Фото</div>
        <MediaUploader
          attachToPersonId={person.id}
          existingMediaIds={draft.photoIds}
          onChange={(ids) => setDraft({ ...draft, photoIds: ids })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Link to={`/person/${person.id}`} className="text-sm" style={{ color: 'var(--color-accent)' }} onClick={onClose}>
          Открыть глубокий профиль →
        </Link>
        <div className="flex gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-sm opacity-70 hover:opacity-100"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={() => { if (confirm('Удалить (можно восстановить)?')) { snapshot(`delete-person-${person.id}`); softDelete(person.id); onClose(); } }}
          >Удалить</button>
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
            onClick={save}
          >Сохранить</button>
        </div>
      </div>
    </Modal>
  );
}
