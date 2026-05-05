import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppData, Person, Couple, ImportantPerson, LifeEvent, MediaItem, PhotoTag, Theme, ViewMode,
} from '../types';
import { uid } from '../utils/id';
import { storage } from '../storage/StorageAdapter';

type HistoryEntry = { label: string; data: AppData; ts: number };

type State = AppData & {
  theme: Theme;
  viewMode: ViewMode;
  showImportantPeople: boolean;
  showMilestones: boolean;
  treeTitle: string;
  /** user-overridden X positions for graph nodes */
  nodeXOverrides: Record<string, number>;
  recentProfiles: Array<{ type: 'person' | 'importantPerson'; id: string; name: string }>;
  history: HistoryEntry[];
  historyIndex: number;
};

type Actions = {
  setTheme: (t: Theme) => void;
  setViewMode: (m: ViewMode) => void;
  toggleImportantPeople: () => void;
  toggleMilestones: () => void;
  setTreeTitle: (s: string) => void;
  setNodeX: (id: string, x: number) => void;
  resetNodePositions: () => void;
  pushRecent: (e: State['recentProfiles'][number]) => void;

  // Person CRUD
  addPerson: (p: Partial<Person>) => string;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  softDeletePerson: (id: string) => void;
  restorePerson: (id: string) => void;

  // Couple CRUD
  addCouple: (partnerAId: string, partnerBId: string, marriageYear?: number) => string;
  updateCouple: (id: string, patch: Partial<Couple>) => void;
  attachChild: (coupleId: string, childId: string) => void;
  setParentsForPerson: (personId: string, coupleId: string) => void;

  // Important Person
  addImportantPerson: (p: Partial<ImportantPerson>) => string;
  updateImportantPerson: (id: string, patch: Partial<ImportantPerson>) => void;
  softDeleteImportantPerson: (id: string) => void;

  // Events
  addEvent: (e: Partial<LifeEvent> & { ownerId: string; ownerType: 'person' | 'couple'; type: LifeEvent['type']; title: string }) => string;
  updateEvent: (id: string, patch: Partial<LifeEvent>) => void;
  deleteEvent: (id: string) => void;

  // Media
  addMedia: (file: File, opts?: { yearTaken?: number; caption?: string; linkedEventId?: string }) => Promise<string>;
  updateMedia: (id: string, patch: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => Promise<void>;
  attachMediaToPerson: (mediaId: string, personId: string, kind?: 'person' | 'importantPerson') => void;

  // Photo tags
  addPhotoTag: (mediaId: string, tag: Omit<PhotoTag, 'id'>) => string;
  updatePhotoTag: (mediaId: string, tagId: string, patch: Partial<PhotoTag>) => void;
  deletePhotoTag: (mediaId: string, tagId: string) => void;

  // History
  snapshot: (label: string) => void;
  undo: () => void;

  // Import / Export
  exportJson: () => string;
  importJson: (json: string) => void;
  resetAll: () => void;
};

const emptyData: AppData = {
  people: {},
  couples: {},
  importantPeople: {},
  events: {},
  media: {},
  rootPersonId: undefined,
};

const dataOf = (s: State): AppData => ({
  people: s.people, couples: s.couples,
  importantPeople: s.importantPeople, events: s.events,
  media: s.media, rootPersonId: s.rootPersonId,
});

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...emptyData,
      theme: 'dark',
      viewMode: 'graph',
      showImportantPeople: true,
      showMilestones: false,
      treeTitle: 'Семейное древо',
      nodeXOverrides: {},
      recentProfiles: [],
      history: [],
      historyIndex: -1,

      setTheme: (theme) => set({ theme }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleImportantPeople: () => set((s) => ({ showImportantPeople: !s.showImportantPeople })),
      toggleMilestones: () => set((s) => ({ showMilestones: !s.showMilestones })),
      setTreeTitle: (s) => set({ treeTitle: s }),
      setNodeX: (id, x) => set((s) => ({ nodeXOverrides: { ...s.nodeXOverrides, [id]: x } })),
      resetNodePositions: () => set({ nodeXOverrides: {} }),
      pushRecent: (e) => set((s) => {
        const filtered = s.recentProfiles.filter((r) => !(r.type === e.type && r.id === e.id));
        return { recentProfiles: [e, ...filtered].slice(0, 10) };
      }),

      addPerson: (p) => {
        const id = p.id ?? uid('p');
        const person: Person = {
          id,
          firstName: p.firstName ?? 'Имя',
          lastName: p.lastName ?? '',
          maidenName: p.maidenName,
          gender: p.gender ?? 'male',
          birthYear: p.birthYear,
          deathYear: p.deathYear,
          bio: p.bio,
          photoIds: p.photoIds ?? [],
          videoIds: p.videoIds ?? [],
          parentCoupleId: p.parentCoupleId,
          lifeEventIds: p.lifeEventIds ?? [],
          generation: p.generation,
        };
        set((s) => ({ people: { ...s.people, [id]: person } }));
        return id;
      },
      updatePerson: (id, patch) => set((s) => ({
        people: s.people[id] ? { ...s.people, [id]: { ...s.people[id], ...patch } } : s.people,
      })),
      softDeletePerson: (id) => set((s) => ({
        people: s.people[id] ? { ...s.people, [id]: { ...s.people[id], isDeleted: true } } : s.people,
      })),
      restorePerson: (id) => set((s) => ({
        people: s.people[id] ? { ...s.people, [id]: { ...s.people[id], isDeleted: false } } : s.people,
      })),

      addCouple: (partnerAId, partnerBId, marriageYear) => {
        const id = uid('c');
        const couple: Couple = {
          id, partnerAId, partnerBId, childrenIds: [], marriageYear, lifeEventIds: [],
        };
        set((s) => ({ couples: { ...s.couples, [id]: couple } }));
        return id;
      },
      updateCouple: (id, patch) => set((s) => ({
        couples: s.couples[id] ? { ...s.couples, [id]: { ...s.couples[id], ...patch } } : s.couples,
      })),
      attachChild: (coupleId, childId) => set((s) => {
        const c = s.couples[coupleId];
        if (!c || c.childrenIds.includes(childId)) return {};
        return {
          couples: { ...s.couples, [coupleId]: { ...c, childrenIds: [...c.childrenIds, childId] } },
          people: s.people[childId]
            ? { ...s.people, [childId]: { ...s.people[childId], parentCoupleId: coupleId } }
            : s.people,
        };
      }),
      setParentsForPerson: (personId, coupleId) => set((s) => ({
        people: s.people[personId]
          ? { ...s.people, [personId]: { ...s.people[personId], parentCoupleId: coupleId } }
          : s.people,
        couples: s.couples[coupleId] && !s.couples[coupleId].childrenIds.includes(personId)
          ? { ...s.couples, [coupleId]: { ...s.couples[coupleId], childrenIds: [...s.couples[coupleId].childrenIds, personId] } }
          : s.couples,
      })),

      addImportantPerson: (p) => {
        const id = p.id ?? uid('ip');
        const ip: ImportantPerson = {
          id,
          firstName: p.firstName ?? 'Имя',
          lastName: p.lastName ?? '',
          birthYear: p.birthYear,
          deathYear: p.deathYear,
          bio: p.bio,
          importance: p.importance ?? '',
          relationshipType: p.relationshipType ?? 'друг',
          photoIds: p.photoIds ?? [],
          videoIds: p.videoIds ?? [],
          linkedTo: p.linkedTo ?? [],
        };
        set((s) => ({ importantPeople: { ...s.importantPeople, [id]: ip } }));
        return id;
      },
      updateImportantPerson: (id, patch) => set((s) => ({
        importantPeople: s.importantPeople[id]
          ? { ...s.importantPeople, [id]: { ...s.importantPeople[id], ...patch } }
          : s.importantPeople,
      })),
      softDeleteImportantPerson: (id) => set((s) => ({
        importantPeople: s.importantPeople[id]
          ? { ...s.importantPeople, [id]: { ...s.importantPeople[id], isDeleted: true } }
          : s.importantPeople,
      })),

      addEvent: (e) => {
        const id = uid('e');
        const event: LifeEvent = {
          id,
          ownerId: e.ownerId,
          ownerType: e.ownerType,
          type: e.type,
          title: e.title,
          date: e.date,
          location: e.location,
          description: e.description,
          photoIds: e.photoIds ?? [],
          videoIds: e.videoIds ?? [],
          linkedEntities: e.linkedEntities ?? [],
        };
        set((s) => {
          const next: Partial<State> = { events: { ...s.events, [id]: event } };
          if (event.ownerType === 'person' && s.people[event.ownerId]) {
            next.people = { ...s.people, [event.ownerId]: { ...s.people[event.ownerId], lifeEventIds: [...s.people[event.ownerId].lifeEventIds, id] } };
          }
          if (event.ownerType === 'couple' && s.couples[event.ownerId]) {
            next.couples = { ...s.couples, [event.ownerId]: { ...s.couples[event.ownerId], lifeEventIds: [...s.couples[event.ownerId].lifeEventIds, id] } };
          }
          return next as State;
        });
        // automation
        if (event.type === 'death' && event.ownerType === 'person') {
          const year = event.date ? Number(event.date.slice(0, 4)) : undefined;
          if (year) get().updatePerson(event.ownerId, { deathYear: year });
        }
        return id;
      },
      updateEvent: (id, patch) => set((s) => ({
        events: s.events[id] ? { ...s.events, [id]: { ...s.events[id], ...patch } } : s.events,
      })),
      deleteEvent: (id) => set((s) => {
        const ev = s.events[id];
        if (!ev) return {};
        const events = { ...s.events };
        delete events[id];
        const next: Partial<State> = { events };
        if (ev.ownerType === 'person' && s.people[ev.ownerId]) {
          next.people = { ...s.people, [ev.ownerId]: { ...s.people[ev.ownerId], lifeEventIds: s.people[ev.ownerId].lifeEventIds.filter((x) => x !== id) } };
        }
        if (ev.ownerType === 'couple' && s.couples[ev.ownerId]) {
          next.couples = { ...s.couples, [ev.ownerId]: { ...s.couples[ev.ownerId], lifeEventIds: s.couples[ev.ownerId].lifeEventIds.filter((x) => x !== id) } };
        }
        return next as State;
      }),

      addMedia: async (file, opts) => {
        const id = uid('m');
        await storage.putMedia(id, file, file.type);
        const isVideo = file.type.startsWith('video');
        const m: MediaItem = {
          id,
          type: isVideo ? 'video' : 'photo',
          caption: opts?.caption,
          yearTaken: opts?.yearTaken,
          tags: [],
          linkedEventId: opts?.linkedEventId,
        };
        set((s) => ({ media: { ...s.media, [id]: m } }));
        return id;
      },
      updateMedia: (id, patch) => set((s) => ({
        media: s.media[id] ? { ...s.media, [id]: { ...s.media[id], ...patch } } : s.media,
      })),
      deleteMedia: async (id) => {
        await storage.deleteMedia(id);
        set((s) => {
          const m = { ...s.media };
          delete m[id];
          return { media: m };
        });
      },
      attachMediaToPerson: (mediaId, personId, kind = 'person') => {
        if (kind === 'person') {
          set((s) => {
            const p = s.people[personId];
            if (!p) return {};
            const isVideo = s.media[mediaId]?.type === 'video';
            const key = isVideo ? 'videoIds' : 'photoIds';
            if (p[key].includes(mediaId)) return {};
            return { people: { ...s.people, [personId]: { ...p, [key]: [...p[key], mediaId] } } };
          });
        } else {
          set((s) => {
            const p = s.importantPeople[personId];
            if (!p) return {};
            const isVideo = s.media[mediaId]?.type === 'video';
            const key = isVideo ? 'videoIds' : 'photoIds';
            if (p[key].includes(mediaId)) return {};
            return { importantPeople: { ...s.importantPeople, [personId]: { ...p, [key]: [...p[key], mediaId] } } };
          });
        }
      },

      addPhotoTag: (mediaId, tag) => {
        const id = uid('t');
        set((s) => {
          const m = s.media[mediaId];
          if (!m) return {};
          return { media: { ...s.media, [mediaId]: { ...m, tags: [...m.tags, { ...tag, id }] } } };
        });
        return id;
      },
      updatePhotoTag: (mediaId, tagId, patch) => set((s) => {
        const m = s.media[mediaId];
        if (!m) return {};
        return {
          media: {
            ...s.media,
            [mediaId]: { ...m, tags: m.tags.map((t) => (t.id === tagId ? { ...t, ...patch } : t)) },
          },
        };
      }),
      deletePhotoTag: (mediaId, tagId) => set((s) => {
        const m = s.media[mediaId];
        if (!m) return {};
        return {
          media: { ...s.media, [mediaId]: { ...m, tags: m.tags.filter((t) => t.id !== tagId) } },
        };
      }),

      snapshot: (label) => set((s) => {
        const entry: HistoryEntry = { label, data: dataOf(s), ts: Date.now() };
        const trimmed = s.history.slice(0, s.historyIndex + 1);
        const next = [...trimmed, entry].slice(-20);
        return { history: next, historyIndex: next.length - 1 };
      }),
      undo: () => set((s) => {
        if (s.historyIndex <= 0) return {};
        const prev = s.history[s.historyIndex - 1];
        return { ...prev.data, historyIndex: s.historyIndex - 1 };
      }),

      exportJson: () => JSON.stringify(dataOf(get()), null, 2),
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as AppData;
          set({ ...parsed });
        } catch (e) {
          console.error('Invalid JSON', e);
        }
      },
      resetAll: () => set({ ...emptyData }),
    }),
    {
      name: 'family-tree-data-v1',
      partialize: (s) => ({
        people: s.people,
        couples: s.couples,
        importantPeople: s.importantPeople,
        events: s.events,
        media: s.media,
        rootPersonId: s.rootPersonId,
        theme: s.theme,
        viewMode: s.viewMode,
        showImportantPeople: s.showImportantPeople,
        showMilestones: s.showMilestones,
        treeTitle: s.treeTitle,
        nodeXOverrides: s.nodeXOverrides,
        recentProfiles: s.recentProfiles,
      }),
    }
  )
);
