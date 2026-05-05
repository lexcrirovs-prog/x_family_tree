import type { FamilySnapshot, MediaItem } from '../types/family';

export type StoredMediaBlob = {
  id: string;
  type: MediaItem['type'];
  blob: Blob;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
};

export interface MetadataStorageAdapter {
  load(): Promise<FamilySnapshot | null>;
  save(snapshot: FamilySnapshot): Promise<void>;
}

export interface MediaStorageAdapter {
  saveBlob(media: StoredMediaBlob): Promise<void>;
  getBlob(id: string): Promise<StoredMediaBlob | undefined>;
  deleteBlob(id: string): Promise<void>;
}

