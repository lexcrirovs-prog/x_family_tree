import { useState } from 'react';
import { ChevronRight, RotateCcw, Trash2, X } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getFullName, getYears } from '../../utils/family';

export function TrashDrawer() {
  const people = useFamilyStore((s) => s.people);
  const importantPeople = useFamilyStore((s) => s.importantPeople);
  const restorePerson = useFamilyStore((s) => s.restorePerson);
  const restoreImportant = useFamilyStore((s) => s.restoreImportantPerson);
  const removePerson = useFamilyStore((s) => s.permanentlyDeletePerson);
  const removeImportant = useFamilyStore((s) => s.permanentlyDeleteImportantPerson);
  const emptyTrash = useFamilyStore((s) => s.emptyTrash);
  const [open, setOpen] = useState(false);

  const deletedPeople = Object.values(people).filter((p) => p.isDeleted);
  const deletedImportant = Object.values(importantPeople).filter((p) => p.isDeleted);
  const total = deletedPeople.length + deletedImportant.length;

  if (total === 0) return null;

  return (
    <>
      <button
        type="button"
        className="trash-float"
        onClick={() => setOpen(true)}
        aria-label={`Корзина: ${total} элемент(а/ов)`}
        title="Корзина — восстановить удалённых"
      >
        <Trash2 size={18} />
        <span className="trash-badge">{total}</span>
      </button>
      {open && (
        <div
          className="trash-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="trash-drawer" role="dialog" aria-label="Корзина">
            <header className="trash-head">
              <strong>Корзина · {total}</strong>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="trash-close"
              >
                <X size={16} />
              </button>
            </header>
            {deletedPeople.length > 0 && (
              <section>
                <h3>Люди</h3>
                <ul>
                  {deletedPeople.map((person) => (
                    <li key={person.id}>
                      <div>
                        <strong>{getFullName(person)}</strong>
                        <small>{getYears(person)}</small>
                      </div>
                      <div className="trash-row-actions">
                        <button
                          type="button"
                          onClick={() => restorePerson(person.id)}
                          title="Восстановить"
                          aria-label={`Восстановить ${getFullName(person)}`}
                        >
                          <RotateCcw size={14} /> Восстановить
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => {
                            if (
                              confirm(`Удалить навсегда «${getFullName(person)}»? Это необратимо.`)
                            ) {
                              removePerson(person.id);
                            }
                          }}
                          title="Удалить навсегда"
                          aria-label={`Удалить навсегда ${getFullName(person)}`}
                        >
                          <X size={14} /> Навсегда
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {deletedImportant.length > 0 && (
              <section>
                <h3>Важные люди</h3>
                <ul>
                  {deletedImportant.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{getFullName(item)}</strong>
                        <small>{item.relationshipType}</small>
                      </div>
                      <div className="trash-row-actions">
                        <button
                          type="button"
                          onClick={() => restoreImportant(item.id)}
                          aria-label={`Восстановить ${getFullName(item)}`}
                        >
                          <RotateCcw size={14} /> Восстановить
                        </button>
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => {
                            if (confirm(`Удалить навсегда «${getFullName(item)}»?`)) {
                              removeImportant(item.id);
                            }
                          }}
                          aria-label={`Удалить навсегда ${getFullName(item)}`}
                        >
                          <X size={14} /> Навсегда
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <footer className="trash-foot">
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  if (confirm('Очистить корзину? Все записи будут удалены навсегда.')) {
                    emptyTrash();
                    setOpen(false);
                  }
                }}
              >
                <Trash2 size={14} /> Очистить корзину
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                Закрыть <ChevronRight size={14} />
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
