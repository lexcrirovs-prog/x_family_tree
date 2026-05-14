import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { MediaItem } from '../../types/family';

type Props = { ownerId: string };

function formatDuration(sec?: number): string {
  if (!sec || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioStories({ ownerId }: Props) {
  const person = useFamilyStore((s) => s.people[ownerId]);
  const mediaMap = useFamilyStore((s) => s.media);
  const updateMediaItem = useFamilyStore((s) => s.updateMediaItem);
  const removeMediaItem = useFamilyStore((s) => s.removeMediaItem);
  const detach = useFamilyStore((s) => s.detachMediaFromPerson);

  const items = (person?.audioIds ?? [])
    .map((id) => mediaMap[id])
    .filter(Boolean) as MediaItem[];

  if (items.length === 0) {
    return (
      <div className="empty-state">
        Аудио-историй пока нет. Загрузите голосовую запись, интервью или песню.
      </div>
    );
  }

  return (
    <div className="audio-list">
      {items.map((item) => (
        <AudioCard
          key={item.id}
          item={item}
          onCaption={(caption) => updateMediaItem(item.id, { caption })}
          onDelete={async () => {
            if (!confirm('Удалить аудиозапись безвозвратно?')) return;
            try {
              await indexedDBMediaAdapter.deleteBlob(item.id);
            } catch (err) {
              console.error(err);
            }
            detach(ownerId, item.id, 'audio');
            removeMediaItem(item.id);
          }}
        />
      ))}
    </div>
  );
}

function AudioCard({
  item,
  onCaption,
  onDelete,
}: {
  item: MediaItem;
  onCaption: (caption: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | undefined>();
  const [caption, setCaption] = useState(item.caption ?? '');

  useEffect(() => {
    let objectUrl: string | undefined;
    indexedDBMediaAdapter.getBlob(item.id).then((stored) => {
      if (!stored) return;
      objectUrl = URL.createObjectURL(stored.blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id]);

  return (
    <div className="audio-card">
      <div className="audio-card-head">
        <input
          className="audio-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption !== item.caption && onCaption(caption)}
          placeholder="Название записи"
        />
        <span className="audio-duration">{formatDuration(item.durationSec)}</span>
        <button type="button" className="danger-action" onClick={onDelete} title="Удалить">
          <Trash2 size={14} />
        </button>
      </div>
      {url ? (
        <audio controls src={url} preload="metadata" />
      ) : (
        <span className="muted-copy">Загрузка…</span>
      )}
    </div>
  );
}
