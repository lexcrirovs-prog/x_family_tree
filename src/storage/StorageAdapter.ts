import Dexie, { type Table } from 'dexie';

export interface MediaBlob {
  id: string;
  blob: Blob;
  mimeType: string;
}

export interface StorageAdapter {
  putMedia(id: string, blob: Blob, mimeType: string): Promise<void>;
  getMedia(id: string): Promise<MediaBlob | undefined>;
  getMediaUrl(id: string): Promise<string | undefined>;
  deleteMedia(id: string): Promise<void>;
  listMediaIds(): Promise<string[]>;
}

class FamilyTreeDB extends Dexie {
  media!: Table<MediaBlob, string>;
  constructor() {
    super('family-tree-db');
    this.version(1).stores({ media: 'id' });
  }
}

class IndexedDBAdapter implements StorageAdapter {
  private db = new FamilyTreeDB();
  private urlCache = new Map<string, string>();

  async putMedia(id: string, blob: Blob, mimeType: string): Promise<void> {
    await this.db.media.put({ id, blob, mimeType });
    const cached = this.urlCache.get(id);
    if (cached) URL.revokeObjectURL(cached);
    this.urlCache.delete(id);
  }
  async getMedia(id: string) {
    return this.db.media.get(id);
  }
  async getMediaUrl(id: string) {
    const cached = this.urlCache.get(id);
    if (cached) return cached;
    const item = await this.db.media.get(id);
    if (!item) return undefined;
    const url = URL.createObjectURL(item.blob);
    this.urlCache.set(id, url);
    return url;
  }
  async deleteMedia(id: string) {
    await this.db.media.delete(id);
    const cached = this.urlCache.get(id);
    if (cached) URL.revokeObjectURL(cached);
    this.urlCache.delete(id);
  }
  async listMediaIds() {
    return this.db.media.toCollection().primaryKeys() as Promise<string[]>;
  }
}

export const storage: StorageAdapter = new IndexedDBAdapter();
