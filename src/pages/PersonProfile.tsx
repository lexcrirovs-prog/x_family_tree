import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { usePersonRelations } from '../hooks/usePersonRelations';
import { Avatar } from '../components/Avatar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { LifeTimeline } from '../components/DeepProfile/LifeTimeline';
import { PhotoGallery } from '../components/DeepProfile/PhotoGallery';
import { VideoGallery } from '../components/DeepProfile/VideoGallery';
import { RelationsBlock } from '../components/DeepProfile/RelationsBlock';
import { MentionsBlock } from '../components/DeepProfile/MentionsBlock';
import { ImportantPersonPanel } from '../components/DeepProfile/ImportantPersonPanel';
import { PersonEditor } from '../components/PersonEditor';
import { EventEditor } from '../components/EventEditor';
import { PhotoViewer } from '../components/PhotoTagger/PhotoViewer';

export function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rel = usePersonRelations(id);
  const pushRecent = useStore((s) => s.pushRecent);
  const setViewMode = useStore((s) => s.setViewMode);
  const [editing, setEditing] = useState(false);
  const [eventModalForOwner, setEventModalForOwner] = useState<string | null>(null);
  const [photoModalId, setPhotoModalId] = useState<string | null>(null);

  useEffect(() => {
    if (rel?.person) {
      pushRecent({ type: 'person', id: rel.person.id, name: `${rel.person.firstName} ${rel.person.lastName}` });
    }
  }, [rel?.person?.id]); // eslint-disable-line

  const fullName = useMemo(
    () => rel?.person ? `${rel.person.firstName} ${rel.person.lastName}${rel.person.maidenName ? ` (${rel.person.maidenName})` : ''}`.trim() : '',
    [rel?.person]
  );

  if (!rel?.person) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="opacity-60">Профиль не найден. <Link to="/" className="underline">К дереву</Link></div>
      </div>
    );
  }
  const p = rel.person;
  const age = p.birthYear ? (p.deathYear ?? new Date().getFullYear()) - p.birthYear : undefined;

  return (
    <div className="scrollbar h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Breadcrumbs crumbs={[{ label: 'Дерево', to: '/' }, { label: fullName }]} />

        {/* Header */}
        <header className="mt-4 flex flex-col items-start gap-6 rounded-2xl border p-6 md:flex-row"
                style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
          <Avatar photoId={p.photoIds[0]} name={fullName} gender={p.gender} size={140} />
          <div className="flex-1">
            <h1 className="text-3xl font-medium">{fullName}</h1>
            <div className="mt-1 text-sm opacity-70">
              {p.birthYear ?? '?'} – {p.deathYear ?? 'наст.'}{age != null && ` · ${age} лет${p.deathYear ? ' (на момент смерти)' : ''}`}
            </div>
            {p.bio && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm opacity-90">{p.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button
                className="rounded-lg px-3 py-1.5 text-white"
                style={{ background: 'var(--color-accent)' }}
                onClick={() => setEditing(true)}
              >Редактировать</button>
              <button
                className="rounded-lg border px-3 py-1.5"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => { setViewMode('graph'); navigate('/'); }}
              >Показать на дереве</button>
              <button
                className="rounded-lg border px-3 py-1.5"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => setEventModalForOwner(p.id)}
              >+ Событие</button>
            </div>
          </div>
        </header>

        {/* Two-column layout */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <main className="md:col-span-2 space-y-6">
            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <h2 className="mb-3 text-lg font-medium">Хронология жизни</h2>
              <LifeTimeline ownerId={p.id} ownerType="person" onAdd={() => setEventModalForOwner(p.id)} />
            </section>

            <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
              <h2 className="mb-3 text-lg font-medium">Фотографии</h2>
              <PhotoGallery
                photoIds={p.photoIds}
                personBirthYear={p.birthYear}
                onOpen={setPhotoModalId}
              />
            </section>

            {p.videoIds.length > 0 && (
              <section className="rounded-2xl border p-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
                <h2 className="mb-3 text-lg font-medium">Видео</h2>
                <VideoGallery videoIds={p.videoIds} />
              </section>
            )}
          </main>

          <aside className="space-y-6">
            <RelationsBlock relations={rel} />
            <ImportantPersonPanel ownerId={p.id} ownerType="person" />
            <MentionsBlock taggedInPhotos={rel.taggedInPhotos} mentionedInEvents={rel.mentionedInEvents} />
          </aside>
        </div>
      </div>

      <PersonEditor personId={editing ? p.id : undefined} onClose={() => setEditing(false)} />
      <EventEditor
        open={!!eventModalForOwner}
        ownerId={eventModalForOwner ?? p.id}
        ownerType="person"
        onClose={() => setEventModalForOwner(null)}
      />
      <PhotoViewer mediaId={photoModalId} onClose={() => setPhotoModalId(null)} />
    </div>
  );
}
