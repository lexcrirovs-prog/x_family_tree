import { useFamilyStore } from '../store/familyStore';
import type { FamilySnapshot } from '../types/family';
import { deleteEntity, upsertEntity, type EntityKind } from './SupabaseAdapter';

const KINDS: EntityKind[] = ['people', 'couples', 'importantPeople', 'events', 'media'];

type Diff = {
  upserts: Map<EntityKind, Map<string, unknown>>;
  deletes: Map<EntityKind, Set<string>>;
};

function emptyDiff(): Diff {
  return {
    upserts: new Map(KINDS.map((k) => [k, new Map()])),
    deletes: new Map(KINDS.map((k) => [k, new Set()])),
  };
}

export function startSupabaseSync(treeId: string): () => void {
  const buffer = emptyDiff();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let prev = snapshotOf(useFamilyStore.getState());

  const flush = async () => {
    flushTimer = null;
    const work = buffer;
    // swap
    const fresh = emptyDiff();
    Object.assign(buffer.upserts, fresh.upserts);
    Object.assign(buffer.deletes, fresh.deletes);
    for (const [kind, map] of work.upserts) {
      for (const [id, data] of map) {
        try {
          if (kind === 'media') {
            const m = data as { type: string; storagePath?: string };
            await upsertEntity(treeId, kind, id, data, {
              type: m.type,
              storage_path: m.storagePath ?? '',
            });
          } else {
            await upsertEntity(treeId, kind, id, data);
          }
        } catch (err) {
          console.error('[supabase sync] upsert', kind, id, err);
        }
      }
    }
    for (const [kind, ids] of work.deletes) {
      for (const id of ids) {
        try {
          await deleteEntity(kind, id);
        } catch (err) {
          console.error('[supabase sync] delete', kind, id, err);
        }
      }
    }
  };

  const schedule = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, 400);
  };

  const unsubscribe = useFamilyStore.subscribe((state) => {
    const next = snapshotOf(state);
    for (const kind of KINDS) {
      const cur = next[kind] as Record<string, unknown>;
      const old = prev[kind] as Record<string, unknown>;
      for (const id of Object.keys(cur)) {
        if (cur[id] !== old[id]) {
          buffer.upserts.get(kind)!.set(id, cur[id]);
          buffer.deletes.get(kind)!.delete(id);
        }
      }
      for (const id of Object.keys(old)) {
        if (!(id in cur)) {
          buffer.deletes.get(kind)!.add(id);
          buffer.upserts.get(kind)!.delete(id);
        }
      }
    }
    prev = next;
    schedule();
  });

  return () => {
    unsubscribe();
    if (flushTimer) {
      clearTimeout(flushTimer);
      void flush();
    }
  };
}

function snapshotOf(state: ReturnType<typeof useFamilyStore.getState>): FamilySnapshot {
  return {
    people: state.people,
    couples: state.couples,
    importantPeople: state.importantPeople,
    events: state.events,
    media: state.media,
  };
}

export async function pushInitialSnapshot(treeId: string, snapshot: FamilySnapshot): Promise<void> {
  for (const kind of KINDS) {
    const entities = snapshot[kind] as Record<string, unknown>;
    for (const [id, data] of Object.entries(entities)) {
      if (kind === 'media') {
        const m = data as { type: string; storagePath?: string };
        await upsertEntity(treeId, kind, id, data, {
          type: m.type,
          storage_path: m.storagePath ?? '',
        });
      } else {
        await upsertEntity(treeId, kind, id, data);
      }
    }
  }
}
