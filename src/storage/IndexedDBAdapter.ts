import Dexie, { type Table } from 'dexie';
import type { MediaItem } from '../types/family';

export type StoredMediaBlob = {
  id: string;
  type: MediaItem['type'];
  blob: Blob;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
};

class FamilyMediaDatabase extends Dexie {
  media!: Table<StoredMediaBlob, string>;

  constructor() {
    super('x-family-tree-media');
    this.version(1).stores({
      media: 'id,type,createdAt',
    });
  }
}

const db = new FamilyMediaDatabase();

export const indexedDBMediaAdapter = {
  async saveBlob(media: StoredMediaBlob): Promise<void> {
    await db.media.put(media);
  },
  async getBlob(id: string): Promise<StoredMediaBlob | undefined> {
    return db.media.get(id);
  },
  async deleteBlob(id: string): Promise<void> {
    await db.media.delete(id);
  },
};
