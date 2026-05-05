import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/store';
import { Avatar } from '../components/Avatar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { LifeTimeline } from '../components/DeepProfile/LifeTimeline';
import { PhotoGallery } from '../components/DeepProfile/PhotoGallery';
import { VideoGallery } from '../components/DeepProfile/VideoGallery';
import { Modal } from '../components/Modal';
import { MediaUploader } from '../components/MediaUploader';
import { EventEditor } from '../components/EventEditor';
import { PhotoViewer } from '../components/PhotoTagger/PhotoViewer';

export function ImportantPersonProfile() {
  const { id } = useParams<{ id: string }>();
  const ip = useStore((s) => (id ? s.importantPeople[id] : undefined));
  const updateIP = useStore((s) => s.updateImportantPerson);
  const people = useStore((s) => s.people);
  const couples = useStore((s) => s.couples);
  const [editing, setEditing] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [photoModalId, setPhotoModalId] = useState<string | null>(null);

  if (!ip) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="opacity-60">Профиль не найден. <Link to="/" className="underline">К дереву</Link></div>
      </div>
    );
  }
  const fullName = `${ip.firstName} ${ip.lastName}`.trim();

  return (
    <div className="scrollbar h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Breadcrumbs crumbs={[{ label: 'Дерево', to: '/' }, { label: `Важные люди`, }, { label: fullName }]} />

        <header className="mt-4 flex flex-col items-start gap-6 rounded-2xl border p-6 md:flex-row"
                style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          <Avatar photoId={ip.photoIds[0]} name={fullName} size={140} />
          <div className="flex-1">
            <h1 className="text-3xl font-medium">{fullName}</h1>
            <div className="mt-1 text-sm opacity-70">
              {ip.relationshipType} · {ip.birthYear ?? '?'} – {ip.deathYear ?? 'наст.'}
            </div>
            {ip.importance && <div className="mt-2 text-sm">{ip.importance}</div>}
            {ip.bio && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm opacity-90">{ip.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                className="rounded-lg px-3 py-1.5 text-white"
                style={{ background: 'var(--color-accent)' }}
                onClick={() => setEditing(true)}
              >Редактировать</button>
              <button
                className="rounded-lg border px-3 py-1.5"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => setEventOpen(true)}
              >+ Событие</button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <main className="md:col-span-2 space-y-6">
            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <h2 className="mb-3 text-lg font-medium">Хронология</h2>
              <LifeTimeline ownerId={ip.id} ownerType="person" onAdd={() => setEventOpen(true)} />
            </section>
            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <h2 className="mb-3 text-lg font-medium">Фотографии</h2>
              <PhotoGallery photoIds={ip.photoIds} personBirthYear={ip.birthYear} onOpen={setPhotoModalId} />
            </section>
            {ip.videoIds.length > 0 && (
              <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                <h2 className="mb-3 text-lg font-medium">Видео</h2>
                <VideoGallery videoIds={ip.videoIds} />
              </section>
            )}
          </main>

          <aside className="space-y-6">
            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <h2 className="mb-3 text-base font-medium">Связан с</h2>
              {ip.linkedTo.length === 0 ? (
                <div className="text-sm opacity-60">Не привязан ни к кому</div>
              ) : (
                <ul className="space-y-1.5">
                  {ip.linkedTo.map((l, i) => {
                    if (l.type === 'person' && people[l.id]) {
                      const p = people[l.id];
                      return (
                        <li key={i}>
                          <Link to={`/person/${l.id}`} className="block rounded-lg border px-3 py-2"
                                style={{ borderColor: 'var(--color-border)' }}>
                            <div className="text-sm">{p.firstName} {p.lastName}</div>
                          </Link>
                        </li>
                      );
                    }
                    if (l.type === 'couple' && couples[l.id]) {
                      const c = couples[l.id];
                      const a = people[c.partnerAId]; const b = people[c.partnerBId];
                      return (
                        <li key={i}>
                          <div className="rounded-lg border px-3 py-2 text-sm"
                               style={{ borderColor: 'var(--color-border)' }}>
                            Пара: {a?.firstName} {a?.lastName} + {b?.firstName} {b?.lastName}
                          </div>
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      <ImportantEditorModal open={editing} onClose={() => setEditing(false)} ip={ip} updateIP={updateIP} />
      <EventEditor open={eventOpen} onClose={() => setEventOpen(false)} ownerId={ip.id} ownerType="person" />
      <PhotoViewer mediaId={photoModalId} onClose={() => setPhotoModalId(null)} />
    </div>
  );
}

function ImportantEditorModal({
  open, onClose, ip, updateIP,
}: {
  open: boolean; onClose: () => void;
  ip: ReturnType<typeof useStore.getState>['importantPeople'][string];
  updateIP: (id: string, patch: Partial<typeof ip>) => void;
}) {
  const [draft, setDraft] = useState(ip);
  return (
    <Modal open={open} onClose={onClose} title="Редактирование">
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
          <span className="opacity-70">Тип отношений</span>
          <input className="w-full" value={draft.relationshipType} onChange={(e) => setDraft({ ...draft, relationshipType: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="opacity-70">Чем важен</span>
          <input className="w-full" value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="opacity-70">Год рождения</span>
          <input type="number" className="w-full" value={draft.birthYear ?? ''}
                 onChange={(e) => setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="text-sm">
          <span className="opacity-70">Год смерти</span>
          <input type="number" className="w-full" value={draft.deathYear ?? ''}
                 onChange={(e) => setDraft({ ...draft, deathYear: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="col-span-2 text-sm">
          <span className="opacity-70">Биография</span>
          <textarea rows={3} className="w-full" value={draft.bio ?? ''} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
        </label>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm opacity-70">Фото</div>
        <MediaUploader
          attachToImportantId={ip.id}
          existingMediaIds={draft.photoIds}
          onChange={(ids) => setDraft({ ...draft, photoIds: ids })}
        />
      </div>
      <div className="mt-5 text-right">
        <button className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: 'var(--color-accent)' }}
                onClick={() => { updateIP(ip.id, draft); onClose(); }}>
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
