import { useState } from 'react';
import { Upload } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { MediaItem } from '../../types/family';
import { createId } from '../../utils/ids';

type MediaUploaderProps = {
  ownerId: string;
};

export function MediaUploader({ ownerId }: MediaUploaderProps) {
  const addMediaItem = useFamilyStore((state) => state.addMediaItem);
  const attachMediaToPerson = useFamilyStore((state) => state.attachMediaToPerson);
  const person = useFamilyStore((state) => state.people[ownerId]);
  const [busy, setBusy] = useState(false);

  return (
    <label className="media-upload" aria-disabled={busy}>
      <Upload size={16} />
      <span>{busy ? 'Загрузка…' : 'Добавить фото/видео'}</span>
      <input
        type="file"
        accept="image/*,video/*"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file || !person) return;
          setBusy(true);
          try {
            const type = file.type.startsWith('video') ? 'video' : 'photo';
            const id = createId('media');
            await indexedDBMediaAdapter.saveBlob({
              id,
              type,
              blob: file,
              fileName: file.name,
              mimeType: file.type,
              createdAt: new Date().toISOString(),
            });
            const media: MediaItem = {
              id,
              type,
              caption: file.name,
              tags: [],
              ownerId,
            };
            addMediaItem(media);
            attachMediaToPerson(ownerId, id, type);
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
