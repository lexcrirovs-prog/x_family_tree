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
  const updatePerson = useFamilyStore((state) => state.updatePerson);
  const person = useFamilyStore((state) => state.people[ownerId]);

  return (
    <label className="media-upload">
      <Upload size={16} />
      <span>Добавить фото/видео</span>
      <input
        type="file"
        accept="image/*,video/*"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file || !person) return;
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
          updatePerson(ownerId, type === 'photo' ? { photoIds: [...person.photoIds, id] } : { videoIds: [...person.videoIds, id] });
          event.currentTarget.value = '';
        }}
      />
    </label>
  );
}

