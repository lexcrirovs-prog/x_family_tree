import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { seedSnapshot } from '../data/seed';
import type {
  ChangeLogEntry,
  Couple,
  FamilySnapshot,
  ImportantPerson,
  LifeEvent,
  MediaItem,
  Person,
  ThemeMode,
  ViewMode,
} from '../types/family';
import { createId } from '../utils/ids';

export type TreeRole = 'owner' | 'editor' | 'viewer';
export type UiScale = 'normal' | 'large' | 'huge';
export type SurnameFilterMode = 'off' | 'highlight' | 'only';

type FamilyStore = FamilySnapshot & {
  treeId?: string;
  userRole?: TreeRole;
  mode: ViewMode;
  theme: ThemeMode;
  uiScale: UiScale;
  selectedPersonId: string;
  selectedImportantPersonId?: string;
  focusedPersonId?: string;
  fanRootId: string;
  showImportantPeople: boolean;
  surnameFilter?: string;
  surnameFilterMode: SurnameFilterMode;
  kinshipMode: boolean;
  kinshipAnchorId?: string;
  recentPersonIds: string[];
  changeLog: ChangeLogEntry[];
  hydrated: boolean;
  setTreeContext: (treeId: string, userRole: TreeRole) => void;
  hydrate: (snapshot: FamilySnapshot) => void;
  setMode: (mode: ViewMode) => void;
  toggleTheme: () => void;
  cycleUiScale: () => void;
  selectPerson: (id: string) => void;
  selectImportantPerson: (id?: string) => void;
  setFocusedPerson: (id?: string) => void;
  setFanRoot: (id: string) => void;
  toggleImportantPeople: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  updateImportantPerson: (id: string, patch: Partial<ImportantPerson>) => void;
  addParents: (childId: string) => void;
  addSpouse: (personId: string) => void;
  addChild: (coupleId: string) => void;
  addImportantPerson: (
    target: { type: 'person' | 'couple'; id: string },
    seed?: Partial<ImportantPerson>,
  ) => void;
  unpairPartners: (coupleId: string) => void;
  linkPartners: (partnerAId: string, partnerBId: string) => string | undefined;
  attachChildToCouple: (coupleId: string, childId: string) => void;
  detachChildFromCouple: (childId: string) => void;
  toggleKinshipMode: () => void;
  setKinshipAnchor: (id?: string) => void;
  addLifeEvent: (
    owner: { ownerType: LifeEvent['ownerType']; ownerId: string },
    seed?: Partial<LifeEvent>,
  ) => void;
  updateLifeEvent: (id: string, patch: Partial<LifeEvent>) => void;
  removeLifeEvent: (id: string) => void;
  attachMediaToEvent: (
    eventId: string,
    mediaId: string,
    kind: 'photo' | 'video' | 'audio',
  ) => void;
  detachMediaFromEvent: (
    eventId: string,
    mediaId: string,
    kind: 'photo' | 'video' | 'audio',
  ) => void;
  addMediaItem: (media: MediaItem) => void;
  attachMediaToPerson: (personId: string, mediaId: string, kind: 'photo' | 'video' | 'audio') => void;
  detachMediaFromPerson: (
    personId: string,
    mediaId: string,
    kind: 'photo' | 'video' | 'audio',
  ) => void;
  updateMediaItem: (id: string, patch: Partial<MediaItem>) => void;
  removeMediaItem: (id: string) => void;
  softDeletePerson: (id: string) => void;
  restorePerson: (id: string) => void;
  softDeleteImportantPerson: (id: string) => void;
  restoreImportantPerson: (id: string) => void;
  permanentlyDeletePerson: (id: string) => void;
  permanentlyDeleteImportantPerson: (id: string) => void;
  emptyTrash: () => void;
  setPersonPosition: (id: string, x: number, y: number) => void;
  setImportantPosition: (id: string, x: number, y: number) => void;
  resetAllPositions: () => void;
  setSurnameFilter: (surname: string | undefined) => void;
  setSurnameFilterMode: (mode: SurnameFilterMode) => void;
  clearSurnameFilter: () => void;
  importSnapshot: (snapshot: FamilySnapshot) => void;
  resetSeed: () => void;
  snapshot: () => FamilySnapshot;
};

function logEntry(label: string): ChangeLogEntry {
  return { id: createId('change'), at: new Date().toISOString(), label };
}

function withLog(state: FamilyStore, label: string): Pick<FamilyStore, 'changeLog'> {
  return { changeLog: [logEntry(label), ...state.changeLog].slice(0, 20) };
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
  ...seedSnapshot,
  treeId: undefined,
  // Default to 'owner' so the local (no-auth) mode shows edit UI everywhere.
  userRole: 'owner' as TreeRole,
  mode: 'graph',
  theme: 'dark',
  uiScale: 'normal' as UiScale,
  selectedPersonId: 'me',
  selectedImportantPersonId: undefined,
  focusedPersonId: undefined,
  fanRootId: 'me',
  showImportantPeople: true,
  surnameFilter: undefined,
  surnameFilterMode: 'off' as SurnameFilterMode,
  kinshipMode: false,
  kinshipAnchorId: undefined,
  recentPersonIds: ['me'],
  changeLog: [],
  hydrated: false,
  setTreeContext: (treeId, userRole) => set({ treeId, userRole }),
  hydrate: (snapshot) =>
    set(() => {
      const firstPerson =
        snapshot.people[Object.keys(snapshot.people)[0] ?? ''] ??
        seedSnapshot.people.me;
      return {
        people: snapshot.people,
        couples: snapshot.couples,
        importantPeople: snapshot.importantPeople,
        events: snapshot.events,
        media: snapshot.media,
        selectedPersonId: snapshot.people.me ? 'me' : firstPerson.id,
        fanRootId: snapshot.people.me ? 'me' : firstPerson.id,
        recentPersonIds: [snapshot.people.me ? 'me' : firstPerson.id],
        hydrated: true,
      };
    }),
  setMode: (mode) => set({ mode }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  cycleUiScale: () =>
    set((state) => {
      const order: UiScale[] = ['normal', 'large', 'huge'];
      const next = order[(order.indexOf(state.uiScale) + 1) % order.length];
      return { uiScale: next };
    }),
  selectPerson: (id) =>
    set((state) => ({
      selectedPersonId: id,
      selectedImportantPersonId: undefined,
      recentPersonIds: [id, ...state.recentPersonIds.filter((item) => item !== id)].slice(0, 10),
    })),
  selectImportantPerson: (id) =>
    set({ selectedImportantPersonId: id, focusedPersonId: undefined }),
  setFocusedPerson: (id) => set({ focusedPersonId: id }),
  setFanRoot: (id) => set({ fanRootId: id }),
  toggleImportantPeople: () =>
    set((state) => ({ showImportantPeople: !state.showImportantPeople })),
  updatePerson: (id, patch) =>
    set((state) => ({
      people: { ...state.people, [id]: { ...state.people[id], ...patch } },
      ...withLog(state, `Обновлён профиль: ${state.people[id]?.firstName ?? id}`),
    })),
  updateImportantPerson: (id, patch) =>
    set((state) => ({
      importantPeople: {
        ...state.importantPeople,
        [id]: { ...state.importantPeople[id], ...patch },
      },
      ...withLog(state, `Обновлён важный человек: ${state.importantPeople[id]?.firstName ?? id}`),
    })),
  addParents: (childId) =>
    set((state) => {
      const child = state.people[childId];
      if (!child) return {};
      // Reject only if parents already exist as a real couple; dangling IDs are
      // treated as "no parents" so we can heal stale references.
      const existingCouple = child.parentCoupleId
        ? state.couples[child.parentCoupleId]
        : undefined;
      if (existingCouple) return {};
      const generation = child.generation - 1;
      const parentAId = createId('person');
      const parentBId = createId('person');
      const coupleId = createId('couple');
      const parentA: Person = {
        id: parentAId,
        firstName: 'Отец',
        lastName: child.lastName,
        gender: 'male',
        photoIds: [],
        videoIds: [],
        audioIds: [],
        lifeEventIds: [],
        generation,
        branch: child.branch === 'self' ? 'paternal' : child.branch,
      };
      const parentB: Person = {
        id: parentBId,
        firstName: 'Мать',
        lastName: child.lastName,
        gender: 'female',
        photoIds: [],
        videoIds: [],
        audioIds: [],
        lifeEventIds: [],
        generation,
        branch: child.branch === 'self' ? 'maternal' : child.branch,
      };
      const couple: Couple = {
        id: coupleId,
        partnerAId: parentAId,
        partnerBId: parentBId,
        childrenIds: [childId],
        lifeEventIds: [],
      };

      return {
        people: {
          ...state.people,
          [childId]: { ...child, parentCoupleId: coupleId },
          [parentAId]: parentA,
          [parentBId]: parentB,
        },
        couples: { ...state.couples, [coupleId]: couple },
        selectedPersonId: parentAId,
        ...withLog(state, `Добавлены родители для ${child.firstName}`),
      };
    }),
  addSpouse: (personId) =>
    set((state) => {
      const person = state.people[personId];
      if (!person) return {};
      const spouseId = createId('person');
      const coupleId = createId('couple');
      const spouse: Person = {
        id: spouseId,
        firstName: person.gender === 'male' ? 'Супруга' : 'Супруг',
        lastName: person.lastName,
        gender: person.gender === 'male' ? 'female' : 'male',
        photoIds: [],
        videoIds: [],
        audioIds: [],
        lifeEventIds: [],
        generation: person.generation,
        branch: 'spouse',
      };
      const couple: Couple = {
        id: coupleId,
        partnerAId: personId,
        partnerBId: spouseId,
        childrenIds: [],
        lifeEventIds: [],
      };
      return {
        people: { ...state.people, [spouseId]: spouse },
        couples: { ...state.couples, [coupleId]: couple },
        selectedPersonId: spouseId,
        ...withLog(state, `Добавлен супруг/супруга для ${person.firstName}`),
      };
    }),
  addChild: (coupleId) =>
    set((state) => {
      const couple = state.couples[coupleId];
      if (!couple) return {};
      const partner = state.people[couple.partnerAId] ?? state.people[couple.partnerBId];
      const childId = createId('person');
      const child: Person = {
        id: childId,
        firstName: 'Ребёнок',
        lastName: partner?.lastName ?? 'Фамилия',
        gender: 'male',
        photoIds: [],
        videoIds: [],
        audioIds: [],
        parentCoupleId: coupleId,
        lifeEventIds: [],
        generation: (partner?.generation ?? -1) + 1,
        branch: partner?.branch ?? 'self',
      };
      return {
        people: { ...state.people, [childId]: child },
        couples: {
          ...state.couples,
          [coupleId]: { ...couple, childrenIds: [...couple.childrenIds, childId] },
        },
        selectedPersonId: childId,
        ...withLog(state, `Добавлен ребёнок для пары ${coupleId}`),
      };
    }),
  addImportantPerson: (target, seed) =>
    set((state) => {
      const id = createId('important');
      const important: ImportantPerson = {
        id,
        firstName: seed?.firstName ?? 'Важный',
        lastName: seed?.lastName ?? 'человек',
        relationshipType: seed?.relationshipType ?? 'друг семьи',
        importance:
          seed?.importance ?? 'Опишите, почему этот человек важен для семейной истории.',
        photoIds: seed?.photoIds ?? [],
        videoIds: seed?.videoIds ?? [],
        bio: seed?.bio,
        birthYear: seed?.birthYear,
        deathYear: seed?.deathYear,
        linkedTo: seed?.linkedTo ?? [target],
      };
      return {
        importantPeople: { ...state.importantPeople, [id]: important },
        selectedImportantPersonId: id,
        ...withLog(state, `Добавлен: ${important.relationshipType}`),
      };
    }),
  unpairPartners: (coupleId) =>
    set((state) => {
      const couple = state.couples[coupleId];
      if (!couple) return {};
      const couples = { ...state.couples };
      delete couples[coupleId];
      const people = { ...state.people };
      for (const childId of couple.childrenIds) {
        if (people[childId]?.parentCoupleId === coupleId) {
          people[childId] = { ...people[childId], parentCoupleId: undefined };
        }
      }
      return {
        couples,
        people,
        ...withLog(state, `Пара ${coupleId} расторгнута`),
      };
    }),
  linkPartners: (partnerAId, partnerBId) => {
    let createdId: string | undefined;
    set((state) => {
      if (!state.people[partnerAId] || !state.people[partnerBId]) return {};
      const existing = Object.values(state.couples).find(
        (c) =>
          (c.partnerAId === partnerAId && c.partnerBId === partnerBId) ||
          (c.partnerAId === partnerBId && c.partnerBId === partnerAId),
      );
      if (existing) {
        createdId = existing.id;
        return {};
      }
      const id = createId('couple');
      const couple: Couple = {
        id,
        partnerAId,
        partnerBId,
        childrenIds: [],
        lifeEventIds: [],
      };
      createdId = id;
      return {
        couples: { ...state.couples, [id]: couple },
        ...withLog(
          state,
          `Создана пара: ${state.people[partnerAId]?.firstName} ↔ ${state.people[partnerBId]?.firstName}`,
        ),
      };
    });
    return createdId;
  },
  attachChildToCouple: (coupleId, childId) =>
    set((state) => {
      const couple = state.couples[coupleId];
      const child = state.people[childId];
      if (!couple || !child) return {};
      const childrenIds = couple.childrenIds.includes(childId)
        ? couple.childrenIds
        : [...couple.childrenIds, childId];
      return {
        couples: { ...state.couples, [coupleId]: { ...couple, childrenIds } },
        people: { ...state.people, [childId]: { ...child, parentCoupleId: coupleId } },
        ...withLog(state, `Привязан ребёнок ${child.firstName} к паре`),
      };
    }),
  detachChildFromCouple: (childId) =>
    set((state) => {
      const child = state.people[childId];
      if (!child || !child.parentCoupleId) return {};
      const couple = state.couples[child.parentCoupleId];
      if (!couple) {
        return {
          people: { ...state.people, [childId]: { ...child, parentCoupleId: undefined } },
        };
      }
      return {
        people: { ...state.people, [childId]: { ...child, parentCoupleId: undefined } },
        couples: {
          ...state.couples,
          [couple.id]: {
            ...couple,
            childrenIds: couple.childrenIds.filter((id) => id !== childId),
          },
        },
        ...withLog(state, `Открепил ребёнка ${child.firstName} от пары`),
      };
    }),
  toggleKinshipMode: () =>
    set((state) => ({
      kinshipMode: !state.kinshipMode,
      kinshipAnchorId: !state.kinshipMode ? state.selectedPersonId : state.kinshipAnchorId,
    })),
  setKinshipAnchor: (id) => set({ kinshipAnchorId: id }),
  addLifeEvent: (owner, seed) =>
    set((state) => {
      const id = createId('event');
      const event: LifeEvent = {
        id,
        ownerId: owner.ownerId,
        ownerType: owner.ownerType,
        type: seed?.type ?? 'custom',
        title: seed?.title ?? 'Новое событие',
        date: seed?.date,
        location: seed?.location,
        description: seed?.description,
        photoIds: [],
        videoIds: [],
        audioIds: [],
        linkedEntities: seed?.linkedEntities ?? [],
      };

      const people = { ...state.people };
      const couples = { ...state.couples };
      if (owner.ownerType === 'person' && people[owner.ownerId]) {
        people[owner.ownerId] = {
          ...people[owner.ownerId],
          lifeEventIds: [...people[owner.ownerId].lifeEventIds, id],
        };
      }
      if (owner.ownerType === 'couple' && couples[owner.ownerId]) {
        couples[owner.ownerId] = {
          ...couples[owner.ownerId],
          lifeEventIds: [...couples[owner.ownerId].lifeEventIds, id],
        };
      }

      return {
        people,
        couples,
        events: { ...state.events, [id]: event },
        ...withLog(state, `Добавлено событие: ${event.title}`),
      };
    }),
  updateLifeEvent: (id, patch) =>
    set((state) => {
      if (!state.events[id]) return {};
      return {
        events: { ...state.events, [id]: { ...state.events[id], ...patch } },
        ...withLog(state, `Обновлено событие: ${state.events[id].title}`),
      };
    }),
  removeLifeEvent: (id) =>
    set((state) => {
      const event = state.events[id];
      if (!event) return {};
      const events = { ...state.events };
      delete events[id];
      const people = { ...state.people };
      const couples = { ...state.couples };
      if (event.ownerType === 'person' && people[event.ownerId]) {
        people[event.ownerId] = {
          ...people[event.ownerId],
          lifeEventIds: people[event.ownerId].lifeEventIds.filter((x) => x !== id),
        };
      }
      if (event.ownerType === 'couple' && couples[event.ownerId]) {
        couples[event.ownerId] = {
          ...couples[event.ownerId],
          lifeEventIds: couples[event.ownerId].lifeEventIds.filter((x) => x !== id),
        };
      }
      return {
        events,
        people,
        couples,
        ...withLog(state, `Удалено событие: ${event.title}`),
      };
    }),
  attachMediaToEvent: (eventId, mediaId, kind) =>
    set((state) => {
      const event = state.events[eventId];
      if (!event) return {};
      const key = kind === 'photo' ? 'photoIds' : kind === 'video' ? 'videoIds' : 'audioIds';
      const existing = event[key] ?? [];
      if (existing.includes(mediaId)) return {};
      return {
        events: {
          ...state.events,
          [eventId]: { ...event, [key]: [...existing, mediaId] },
        },
      };
    }),
  detachMediaFromEvent: (eventId, mediaId, kind) =>
    set((state) => {
      const event = state.events[eventId];
      if (!event) return {};
      const key = kind === 'photo' ? 'photoIds' : kind === 'video' ? 'videoIds' : 'audioIds';
      const existing = event[key] ?? [];
      return {
        events: {
          ...state.events,
          [eventId]: { ...event, [key]: existing.filter((id) => id !== mediaId) },
        },
      };
    }),
  addMediaItem: (media) =>
    set((state) => ({
      media: { ...state.media, [media.id]: media },
      ...withLog(
        state,
        media.type === 'photo'
          ? 'Добавлено фото'
          : media.type === 'video'
          ? 'Добавлено видео'
          : 'Добавлена аудиоистория',
      ),
    })),
  attachMediaToPerson: (personId, mediaId, kind) =>
    set((state) => {
      const person = state.people[personId];
      if (!person) return {};
      const key = kind === 'photo' ? 'photoIds' : kind === 'video' ? 'videoIds' : 'audioIds';
      const existing = person[key] ?? [];
      if (existing.includes(mediaId)) return {};
      return {
        people: {
          ...state.people,
          [personId]: { ...person, [key]: [...existing, mediaId] },
        },
      };
    }),
  detachMediaFromPerson: (personId, mediaId, kind) =>
    set((state) => {
      const person = state.people[personId];
      if (!person) return {};
      const key = kind === 'photo' ? 'photoIds' : kind === 'video' ? 'videoIds' : 'audioIds';
      const existing = person[key] ?? [];
      return {
        people: {
          ...state.people,
          [personId]: { ...person, [key]: existing.filter((id) => id !== mediaId) },
        },
      };
    }),
  updateMediaItem: (id, patch) =>
    set((state) => ({
      media: { ...state.media, [id]: { ...state.media[id], ...patch } },
      ...withLog(state, 'Обновлены медиа-метаданные'),
    })),
  removeMediaItem: (id) =>
    set((state) => {
      const next = { ...state.media };
      delete next[id];
      return { media: next, ...withLog(state, 'Удалён медиафайл') };
    }),
  softDeletePerson: (id) =>
    set((state) => ({
      people: { ...state.people, [id]: { ...state.people[id], isDeleted: true } },
      ...withLog(state, `Удалён профиль: ${state.people[id]?.firstName ?? id}`),
    })),
  restorePerson: (id) =>
    set((state) => ({
      people: { ...state.people, [id]: { ...state.people[id], isDeleted: false } },
      ...withLog(state, `Восстановлен профиль: ${state.people[id]?.firstName ?? id}`),
    })),
  softDeleteImportantPerson: (id) =>
    set((state) => ({
      importantPeople: {
        ...state.importantPeople,
        [id]: { ...state.importantPeople[id], isDeleted: true },
      },
      ...withLog(state, `Удалён важный человек: ${state.importantPeople[id]?.firstName ?? id}`),
    })),
  restoreImportantPerson: (id) =>
    set((state) => ({
      importantPeople: {
        ...state.importantPeople,
        [id]: { ...state.importantPeople[id], isDeleted: false },
      },
      ...withLog(
        state,
        `Восстановлен важный человек: ${state.importantPeople[id]?.firstName ?? id}`,
      ),
    })),
  permanentlyDeletePerson: (id) =>
    set((state) => {
      const person = state.people[id];
      if (!person) return {};
      const people = { ...state.people };
      delete people[id];
      // Clean references in couples (remove couples where person was a partner; orphan children to no couple).
      const couples = { ...state.couples };
      for (const couple of Object.values(couples)) {
        if (couple.partnerAId === id || couple.partnerBId === id) {
          for (const childId of couple.childrenIds) {
            if (people[childId]) {
              people[childId] = { ...people[childId], parentCoupleId: undefined };
            }
          }
          delete couples[couple.id];
        } else if (couple.childrenIds.includes(id)) {
          couples[couple.id] = {
            ...couple,
            childrenIds: couple.childrenIds.filter((cid) => cid !== id),
          };
        }
      }
      return {
        people,
        couples,
        ...withLog(state, `Окончательно удалён: ${person.firstName ?? id}`),
      };
    }),
  permanentlyDeleteImportantPerson: (id) =>
    set((state) => {
      const importantPeople = { ...state.importantPeople };
      const target = importantPeople[id];
      if (!target) return {};
      delete importantPeople[id];
      return {
        importantPeople,
        ...withLog(state, `Окончательно удалён важный: ${target.firstName ?? id}`),
      };
    }),
  emptyTrash: () =>
    set((state) => {
      const peopleEntries = Object.values(state.people).filter((p) => p.isDeleted);
      const importantEntries = Object.values(state.importantPeople).filter((p) => p.isDeleted);
      // Apply each permanent delete sequentially via the store actions
      // (we can't recurse set; do it inline)
      let nextPeople = { ...state.people };
      let nextCouples = { ...state.couples };
      for (const person of peopleEntries) {
        delete nextPeople[person.id];
        for (const couple of Object.values(nextCouples)) {
          if (couple.partnerAId === person.id || couple.partnerBId === person.id) {
            for (const childId of couple.childrenIds) {
              if (nextPeople[childId]) {
                nextPeople[childId] = { ...nextPeople[childId], parentCoupleId: undefined };
              }
            }
            delete nextCouples[couple.id];
          } else if (couple.childrenIds.includes(person.id)) {
            nextCouples[couple.id] = {
              ...couple,
              childrenIds: couple.childrenIds.filter((cid) => cid !== person.id),
            };
          }
        }
      }
      const nextImportant = { ...state.importantPeople };
      for (const item of importantEntries) {
        delete nextImportant[item.id];
      }
      return {
        people: nextPeople,
        couples: nextCouples,
        importantPeople: nextImportant,
        ...withLog(
          state,
          `Корзина очищена (людей: ${peopleEntries.length}, важных: ${importantEntries.length})`,
        ),
      };
    }),
  setPersonPosition: (id, x, y) =>
    set((state) => {
      const person = state.people[id];
      if (!person) return {};
      return {
        people: { ...state.people, [id]: { ...person, customPosition: { x, y } } },
      };
    }),
  setImportantPosition: (id, x, y) =>
    set((state) => {
      const item = state.importantPeople[id];
      if (!item) return {};
      return {
        importantPeople: {
          ...state.importantPeople,
          [id]: { ...item, customPosition: { x, y } },
        },
      };
    }),
  resetAllPositions: () =>
    set((state) => {
      const people: typeof state.people = {};
      for (const [id, p] of Object.entries(state.people)) {
        const { customPosition: _drop, ...rest } = p;
        people[id] = rest;
      }
      const importantPeople: typeof state.importantPeople = {};
      for (const [id, p] of Object.entries(state.importantPeople)) {
        const { customPosition: _drop, ...rest } = p;
        importantPeople[id] = rest;
      }
      return { people, importantPeople, ...withLog(state, 'Сброшена раскладка узлов') };
    }),
  setSurnameFilter: (surname) =>
    set((state) => ({
      surnameFilter: surname,
      surnameFilterMode:
        state.surnameFilterMode === 'off' && surname ? 'highlight' : state.surnameFilterMode,
    })),
  setSurnameFilterMode: (mode) => set({ surnameFilterMode: mode }),
  clearSurnameFilter: () => set({ surnameFilter: undefined, surnameFilterMode: 'off' }),
  importSnapshot: (snapshot) =>
    set((state) => ({
      ...snapshot,
      selectedPersonId: Object.keys(snapshot.people)[0] ?? 'me',
      ...withLog(state, 'Импортирован JSON-бэкап'),
    })),
  resetSeed: () =>
    set((state) => ({ ...seedSnapshot, ...withLog(state, 'Данные сброшены к примеру') })),
  snapshot: () => {
    const state = get();
    return {
      people: state.people,
      couples: state.couples,
      importantPeople: state.importantPeople,
      events: state.events,
      media: state.media,
    };
  },
    }),
    {
      name: 'x-family-tree-metadata',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        people: state.people,
        couples: state.couples,
        importantPeople: state.importantPeople,
        events: state.events,
        media: state.media,
        mode: state.mode,
        theme: state.theme,
        uiScale: state.uiScale,
        selectedPersonId: state.selectedPersonId,
        fanRootId: state.fanRootId,
        showImportantPeople: state.showImportantPeople,
        surnameFilter: state.surnameFilter,
        surnameFilterMode: state.surnameFilterMode,
        recentPersonIds: state.recentPersonIds,
        changeLog: state.changeLog,
      }),
    },
  ),
);
