import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/store';
import { Modal } from '../Modal';

export function ImportantPersonPanel({
  ownerId, ownerType,
}: { ownerId: string; ownerType: 'person' | 'couple' }) {
  const importantPeople = useStore((s) => s.importantPeople);
  const addIP = useStore((s) => s.addImportantPerson);
  const updateIP = useStore((s) => s.updateImportantPerson);

  const linked = Object.values(importantPeople).filter(
    (ip) => !ip.isDeleted && ip.linkedTo.some((l) => l.type === ownerType && l.id === ownerId)
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', importance: '', relationshipType: 'друг' });

  const submit = () => {
    if (!draft.firstName) return;
    const id = addIP({ ...draft });
    updateIP(id, { linkedTo: [{ type: ownerType, id: ownerId }] });
    setDraft({ firstName: '', lastName: '', importance: '', relationshipType: 'друг' });
    setOpen(false);
  };

  return (
    <section className="rounded-2xl border p-5"
             style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Важные люди</h2>
        <button
          className="rounded-lg border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => setOpen(true)}
        >+ Добавить</button>
      </div>
      {linked.length === 0 ? (
        <div className="text-sm opacity-60">Никого ещё не привязано</div>
      ) : (
        <ul className="space-y-1.5">
          {linked.map((ip) => (
            <li key={ip.id}>
              <Link
                to={`/important-person/${ip.id}`}
                className="block rounded-lg border px-3 py-2 hover:opacity-80"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="text-sm">{ip.firstName} {ip.lastName}</div>
                <div className="text-xs opacity-60">{ip.relationshipType}{ip.importance ? ` · ${ip.importance}` : ''}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Новый важный человек">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="opacity-70">Имя</span>
            <input className="w-full" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="opacity-70">Фамилия</span>
            <input className="w-full" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="opacity-70">Кто (наставник, кум…)</span>
            <input className="w-full" value={draft.relationshipType} onChange={(e) => setDraft({ ...draft, relationshipType: e.target.value })} />
          </label>
          <label className="col-span-2 text-sm">
            <span className="opacity-70">Чем был важен</span>
            <textarea className="w-full" rows={2} value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 text-right">
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent)' }}
            onClick={submit}
          >Создать</button>
        </div>
      </Modal>
    </section>
  );
}
