import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { uploadMediaBlob } from '../../storage/SupabaseAdapter';
import type { MediaItem } from '../../types/family';
import { createId } from '../../utils/ids';

type MediaUploaderProps = {
  ownerId: string;
};

export function MediaUploader({ ownerId }: MediaUploaderProps) {
  const treeId = useFamilyStore((state) => state.treeId);
  const userRole = useFamilyStore((state) => state.userRole);
  const addMediaItem = useFamilyStore((state) => state.addMediaItem);
  const attachMediaToPerson = useFamilyStore((state) => state.attachMediaToPerson);
  const person = useFamilyStore((state) => state.people[ownerId]);
  const [busy, setBusy] = useState(false);

  const canEdit = userRole === 'owner' || userRole === 'editor';
  if (!canEdit) return null;

  return (
    <label className="media-upload" aria-disabled={busy}>
      <Upload size={16} />
      <span>{busy ? 'Загрузка…' : 'Добавить фото/видео'}</span>
      <input
        type="file"
        accept="image/*,video/*"
        disabled={busy || !treeId}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file || !person || !treeId) return;
          setBusy(true);
          try {
            const type = file.type.startsWith('video') ? 'video' : 'photo';
            const id = createId('media');
            const ext = (file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
            const path = await uploadMediaBlob(treeId, id, file, ext);
            const media: MediaItem = {
              id,
              type,
              caption: file.name,
              tags: [],
              ownerId,
              storagePath: path,
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
