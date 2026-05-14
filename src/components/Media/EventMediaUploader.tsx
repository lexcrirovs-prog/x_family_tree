import { useState } from 'react';
import { ImagePlus, Mic, Upload, Video } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { MediaItem } from '../../types/family';
import { createId } from '../../utils/ids';

type Kind = 'photo' | 'video' | 'audio';

type Props = {
  eventId: string;
  kind: Kind;
};

const ACCEPT: Record<Kind, string> = {
  photo: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
};

const LABEL: Record<Kind, string> = {
  photo: 'Фото',
  video: 'Видео',
  audio: 'Аудио',
};

function Icon({ kind }: { kind: Kind }) {
  if (kind === 'photo') return <ImagePlus size={14} />;
  if (kind === 'video') return <Video size={14} />;
  return <Mic size={14} />;
}

function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => {
      const d = isFinite(audio.duration) ? Math.round(audio.duration) : undefined;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
  });
}

export function EventMediaUploader({ eventId, kind }: Props) {
  const addMediaItem = useFamilyStore((s) => s.addMediaItem);
  const attach = useFamilyStore((s) => s.attachMediaToEvent);
  const [busy, setBusy] = useState(false);

  return (
    <label className="media-upload event-media-upload" aria-disabled={busy}>
      {busy ? <Upload size={14} /> : <Icon kind={kind} />}
      <span>{busy ? 'Загрузка…' : `+ ${LABEL[kind]}`}</span>
      <input
        type="file"
        accept={ACCEPT[kind]}
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const id = createId(kind);
            await indexedDBMediaAdapter.saveBlob({
              id,
              type: kind,
              blob: file,
              fileName: file.name,
              mimeType: file.type,
              createdAt: new Date().toISOString(),
            });
            const duration = kind === 'audio' ? await readAudioDuration(file) : undefined;
            const media: MediaItem = {
              id,
              type: kind,
              caption: file.name.replace(/\.[^.]+$/, ''),
              tags: [],
              durationSec: duration,
            };
            addMediaItem(media);
            attach(eventId, id, kind);
          } catch (err) {
            console.error(err);
            alert('Не удалось загрузить файл: ' + (err as Error).message);
          } finally {
            setBusy(false);
            event.currentTarget.value = '';
          }
        }}
      />
    </label>
  );
}
