import type { FamilySnapshot } from '../types/family';
import type { MetadataStorageAdapter } from './StorageAdapter';

const STORAGE_KEY = 'x-family-tree-metadata';

export class LocalMetadataAdapter implements MetadataStorageAdapter {
  async load(): Promise<FamilySnapshot | null> {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FamilySnapshot) : null;
  }

  async save(snapshot: FamilySnapshot): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}

