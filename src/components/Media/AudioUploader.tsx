import { useState } from 'react';
import { Mic, Upload } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { MediaItem } from '../../types/family';
import { createId } from '../../utils/ids';

type Props = { ownerId: string };

function readDuration(file: File): Promise<number | undefined> {
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

export function AudioUploader({ ownerId }: Props) {
  const addMediaItem = useFamilyStore((s) => s.addMediaItem);
  const attachMediaToPerson = useFamilyStore((s) => s.attachMediaToPerson);
  const [busy, setBusy] = useState(false);

  return (
    <label className="media-upload" aria-disabled={busy}>
      {busy ? <Upload size={16} /> : <Mic size={16} />}
      <span>{busy ? 'Загрузка…' : 'Загрузить аудио-историю'}</span>
      <input
        type="file"
        accept="audio/*"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const id = createId('audio');
            await indexedDBMediaAdapter.saveBlob({
              id,
              type: 'audio',
              blob: file,
              fileName: file.name,
              mimeType: file.type,
              createdAt: new Date().toISOString(),
            });
            const duration = await readDuration(file);
            const media: MediaItem = {
              id,
              type: 'audio',
              caption: file.name.replace(/\.[^.]+$/, ''),
              tags: [],
              ownerId,
              durationSec: duration,
            };
            addMediaItem(media);
            attachMediaToPerson(ownerId, id, 'audio');
          } catch (err) {
            console.error(err);
            alert('Не удалось загрузить аудио: ' + (err as Error).message);
          } finally {
            setBusy(false);
            event.currentTarget.value = '';
          }
        }}
      />
    </label>
  );
}
