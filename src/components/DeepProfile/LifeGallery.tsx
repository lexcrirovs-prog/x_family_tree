import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, Mic, MicOff, Plus, Trash2, TreePine, X } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { LifeEvent, MediaItem } from '../../types/family';
import { eventIcon, getEventsForPerson, getFullName, getYears } from '../../utils/family';
import { getStageOf, stagesForGender, type StageKey } from '../../utils/lifeStages';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { Breadcrumbs } from '../layout/Breadcrumbs';
import { EventMediaUploader } from '../Media/EventMediaUploader';

export function LifeGallery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snapshot = useFamilyStore((state) => state.snapshot());
  const addLifeEvent = useFamilyStore((state) => state.addLifeEvent);
  const updateLifeEvent = useFamilyStore((state) => state.updateLifeEvent);
  const removeLifeEvent = useFamilyStore((state) => state.removeLifeEvent);
  const detachFromEvent = useFamilyStore((state) => state.detachMediaFromEvent);
  const removeMediaItem = useFamilyStore((state) => state.removeMediaItem);
  const person = id ? snapshot.people[id] : undefined;

  if (!person) {
    return (
      <main className="profile-page">
        <Breadcrumbs items={[{ label: 'Профиль не найден' }]} />
        <div className="empty-state">
          Профиль не найден. <Link to="/">Вернуться к дереву</Link>
        </div>
      </main>
    );
  }

  const stages = stagesForGender(person.gender);
  const allEvents = getEventsForPerson(snapshot, person.id);
  const byStage = new Map<StageKey, LifeEvent[]>();
  for (const stage of stages) byStage.set(stage.key, []);
  for (const event of allEvents) {
    const stageKey = getStageOf(event.type);
    if (!byStage.has(stageKey)) byStage.set(stageKey, []);
    byStage.get(stageKey)!.push(event);
  }

  const handleAddEvent = (stage: StageKey) => {
    const stageMeta = stages.find((s) => s.key === stage);
    if (!stageMeta) return;
    addLifeEvent(
      { ownerType: 'person', ownerId: person.id },
      { type: stageMeta.defaultEventType, title: stageMeta.title },
    );
  };

  const handleDeleteMedia = async (
    event: LifeEvent,
    mediaId: string,
    kind: 'photo' | 'video' | 'audio',
  ) => {
    if (!confirm('Удалить файл из события?')) return;
    try {
      await indexedDBMediaAdapter.deleteBlob(mediaId);
    } catch (err) {
      console.error(err);
    }
    detachFromEvent(event.id, mediaId, kind);
    // Remove only if not attached elsewhere
    const isAttachedElsewhere =
      Object.values(snapshot.people).some(
        (p) =>
          (p.photoIds.includes(mediaId) ||
            p.videoIds.includes(mediaId) ||
            (p.audioIds ?? []).includes(mediaId)) &&
          p.id !== person.id,
      ) ||
      Object.values(snapshot.events).some(
        (e) =>
          (e.photoIds.includes(mediaId) ||
            e.videoIds.includes(mediaId) ||
            (e.audioIds ?? []).includes(mediaId)) &&
          e.id !== event.id,
      );
    if (!isAttachedElsewhere) removeMediaItem(mediaId);
  };

  return (
    <main className="life-gallery">
      <Breadcrumbs
        items={[
          { label: getFullName(person), to: `/person/${person.id}` },
          { label: 'Галерея по вехам' },
        ]}
      />
      <header className="profile-header life-gallery-header">
        <button type="button" className="icon-link" onClick={() => navigate(-1)} title="Назад">
          <ArrowLeft size={18} />
        </button>
        <div className="profile-avatar">
          {person.firstName[0]}
          {person.lastName[0]}
        </div>
        <div>
          <h1>{getFullName(person)}</h1>
          <p>{getYears(person)}</p>
          <span>Жизненные вехи: рождение, школа, свадьба, дети, работа, пенсия, памятные события.</span>
        </div>
        <div className="profile-actions">
          <button type="button" onClick={() => navigate(`/person/${person.id}`)}>
            Профиль
          </button>
          <button type="button" onClick={() => navigate('/')}>
            <TreePine size={16} />
            К дереву
          </button>
        </div>
      </header>

      <div className="life-gallery-grid">
        {stages.map((stage) => {
          const events = byStage.get(stage.key) ?? [];
          return (
            <section key={stage.key} className="stage-section">
              <header className="stage-section-head">
                <div>
                  <h2>{stage.title}</h2>
                  <p>{stage.description}</p>
                </div>
                <button
                  type="button"
                  className="stage-add"
                  onClick={() => handleAddEvent(stage.key)}
                >
                  <Plus size={14} /> Событие
                </button>
              </header>
              {events.length === 0 ? (
                <div className="empty-state stage-empty">
                  Пока ничего. Нажмите «+ Событие», чтобы добавить первую запись.
                </div>
              ) : (
                <div className="stage-events">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      mediaMap={snapshot.media}
                      onChange={(patch) => updateLifeEvent(event.id, patch)}
                      onDelete={() => {
                        if (confirm(`Удалить событие "${event.title}"?`)) {
                          removeLifeEvent(event.id);
                        }
                      }}
                      onDeleteMedia={(mediaId, kind) =>
                        handleDeleteMedia(event, mediaId, kind)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function EventCard({
  event,
  mediaMap,
  onChange,
  onDelete,
  onDeleteMedia,
}: {
  event: LifeEvent;
  mediaMap: Record<string, MediaItem>;
  onChange: (patch: Partial<LifeEvent>) => void;
  onDelete: () => void;
  onDeleteMedia: (mediaId: string, kind: 'photo' | 'video' | 'audio') => void;
}) {
  const photos = event.photoIds.map((mid) => mediaMap[mid]).filter(Boolean);
  const videos = event.videoIds.map((mid) => mediaMap[mid]).filter(Boolean);
  const audios = (event.audioIds ?? []).map((mid) => mediaMap[mid]).filter(Boolean);
  const desc = useSpeechToText({
    lang: 'ru-RU',
    onResult: (text) => {
      const next = (event.description ?? '').trim();
      onChange({ description: next ? next + ' ' + text : text });
    },
  });

  return (
    <article className="event-card-gallery">
      <div className="event-card-head">
        <div className="event-icon">{eventIcon(event.type)}</div>
        <div className="event-fields">
          <input
            className="event-title"
            value={event.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Название события"
          />
          <div className="event-meta-row">
            <input
              className="event-date"
              value={event.date ?? ''}
              onChange={(e) => onChange({ date: e.target.value || undefined })}
              placeholder="Дата (например, 1991 или 12.06.1991)"
            />
            <input
              className="event-location"
              value={event.location ?? ''}
              onChange={(e) => onChange({ location: e.target.value || undefined })}
              placeholder="Место"
            />
          </div>
          <div className="event-description-wrap">
            <textarea
              className="event-description"
              value={event.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value || undefined })}
              placeholder="Описание, воспоминания, контекст…"
            />
            {desc.supported && (
              <button
                type="button"
                className={`mic-toggle${desc.isRecording ? ' mic-active' : ''}`}
                onClick={() => (desc.isRecording ? desc.stop() : desc.start())}
                title={desc.isRecording ? 'Остановить запись' : 'Надиктовать голосом (ru-RU)'}
              >
                {desc.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                {desc.isRecording ? 'Слушаю…' : 'Голос'}
              </button>
            )}
          </div>
          <div className="event-link-row">
            <LinkIcon size={14} />
            <input
              className="event-link"
              type="url"
              value={event.link ?? ''}
              placeholder="Ссылка — например, статья в Википедии о заводе/школе/городе"
              onChange={(e) => onChange({ link: e.target.value || undefined })}
            />
            {event.link && (
              <a
                href={event.link}
                target="_blank"
                rel="noreferrer"
                className="event-link-open"
                title="Открыть ссылку в новой вкладке"
              >
                Открыть ↗
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          className="danger-action event-delete"
          onClick={onDelete}
          title="Удалить событие"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="event-media-strip">
        {photos.map((m) => (
          <PhotoThumb
            key={m.id}
            media={m}
            onDelete={() => onDeleteMedia(m.id, 'photo')}
          />
        ))}
        {videos.map((m) => (
          <VideoThumb
            key={m.id}
            media={m}
            onDelete={() => onDeleteMedia(m.id, 'video')}
          />
        ))}
        {audios.map((m) => (
          <AudioThumb
            key={m.id}
            media={m}
            onDelete={() => onDeleteMedia(m.id, 'audio')}
          />
        ))}
        {photos.length + videos.length + audios.length === 0 && (
          <span className="muted-copy event-media-empty">Прикрепите фото, видео или аудио →</span>
        )}
      </div>

      <div className="event-uploaders">
        <EventMediaUploader eventId={event.id} kind="photo" />
        <EventMediaUploader eventId={event.id} kind="video" />
        <EventMediaUploader eventId={event.id} kind="audio" />
      </div>
    </article>
  );
}

function useBlobUrl(mediaId: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    indexedDBMediaAdapter.getBlob(mediaId).then((stored) => {
      if (cancelled || !stored) return;
      objectUrl = URL.createObjectURL(stored.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);
  return url;
}

function PhotoThumb({ media, onDelete }: { media: MediaItem; onDelete: () => void }) {
  const url = useBlobUrl(media.id);
  return (
    <div className="event-thumb event-thumb-photo">
      {url ? <img src={url} alt={media.caption || 'Фото'} /> : <span className="muted-copy">…</span>}
      <button type="button" className="thumb-remove" onClick={onDelete} title="Удалить">
        <X size={12} />
      </button>
      {media.caption && <small className="thumb-caption">{media.caption}</small>}
    </div>
  );
}

function VideoThumb({ media, onDelete }: { media: MediaItem; onDelete: () => void }) {
  const url = useBlobUrl(media.id);
  return (
    <div className="event-thumb event-thumb-video">
      {url ? (
        <video src={url} controls preload="metadata" />
      ) : (
        <span className="muted-copy">…</span>
      )}
      <button type="button" className="thumb-remove" onClick={onDelete} title="Удалить">
        <X size={12} />
      </button>
      {media.caption && <small className="thumb-caption">{media.caption}</small>}
    </div>
  );
}

function AudioThumb({ media, onDelete }: { media: MediaItem; onDelete: () => void }) {
  const url = useBlobUrl(media.id);
  return (
    <div className="event-thumb event-thumb-audio">
      <div className="audio-thumb-head">
        <strong>{media.caption || 'Аудио'}</strong>
        <button type="button" className="thumb-remove" onClick={onDelete} title="Удалить">
          <X size={12} />
        </button>
      </div>
      {url ? <audio src={url} controls preload="metadata" /> : <span className="muted-copy">…</span>}
    </div>
  );
}
