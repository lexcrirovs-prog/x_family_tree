import { indexedDBMediaAdapter } from '../storage/IndexedDBAdapter';
import { useFamilyStore } from '../store/familyStore';
import type { MediaItem } from '../types/family';
import { createId } from './ids';

/**
 * Saves a photo blob to IndexedDB, registers MediaItem metadata, attaches it
 * to the given person and (optionally) sets it as the primary photo.
 * Returns the new media id.
 */
export async function uploadPhotoForPerson(
  personId: string,
  file: File,
  options: { makePrimary?: boolean } = {},
): Promise<string> {
  const store = useFamilyStore.getState();
  const person = store.people[personId];
  if (!person) throw new Error('Unknown person');
  const id = createId('media');
  await indexedDBMediaAdapter.saveBlob({
    id,
    type: 'photo',
    blob: file,
    fileName: file.name,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
  });
  const media: MediaItem = {
    id,
    type: 'photo',
    caption: file.name,
    tags: [],
    ownerId: personId,
  };
  store.addMediaItem(media);
  store.attachMediaToPerson(personId, id, 'photo');
  if (options.makePrimary) {
    store.updatePerson(personId, { primaryPhotoId: id });
  }
  return id;
}
