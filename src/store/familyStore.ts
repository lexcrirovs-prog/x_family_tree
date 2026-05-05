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

type FamilyStore = FamilySnapshot & {
  mode: ViewMode;
  theme: ThemeMode;
  selectedPersonId: string;
  selectedImportantPersonId?: string;
  focusedPersonId?: string;
  showImportantPeople: boolean;
  recentPersonIds: string[];
  changeLog: ChangeLogEntry[];
  setMode: (mode: ViewMode) => void;
  toggleTheme: () => void;
  selectPerson: (id: string) => void;
  selectImportantPerson: (id?: string) => void;
  setFocusedPerson: (id?: string) => void;
  toggleImportantPeople: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  updateImportantPerson: (id: string, patch: Partial<ImportantPerson>) => void;
  addParents: (childId: string) => void;
  addSpouse: (personId: string) => void;
  addChild: (coupleId: string) => void;
  addImportantPerson: (target: { type: 'person' | 'couple'; id: string }) => void;
  addLifeEvent: (owner: { ownerType: LifeEvent['ownerType']; ownerId: string }, seed?: Partial<LifeEvent>) => void;
  addMediaItem: (media: MediaItem) => void;
  updateMediaItem: (id: string, patch: Partial<MediaItem>) => void;
  softDeletePerson: (id: string) => void;
  restorePerson: (id: string) => void;
  importSnapshot: (snapshot: FamilySnapshot) => void;
  resetSeed: () => void;
  snapshot: () => FamilySnapshot;
};

function log(label: string): ChangeLogEntry {
  return { id: createId('change'), at: new Date().toISOString(), label };
}

function withLog(state: FamilyStore, label: string): Pick<FamilyStore, 'changeLog'> {
  return { changeLog: [log(label), ...state.changeLog].slice(0, 20) };
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
      ...seedSnapshot,
      mode: 'graph',
      theme: 'dark',
      selectedPersonId: 'me',
      selectedImportantPersonId: undefined,
      focusedPersonId: undefined,
      showImportantPeople: true,
      recentPersonIds: ['me'],
      changeLog: [],
      setMode: (mode) => set({ mode }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      selectPerson: (id) =>
        set((state) => ({
          selectedPersonId: id,
          selectedImportantPersonId: undefined,
          recentPersonIds: [id, ...state.recentPersonIds.filter((item) => item !== id)].slice(0, 10),
        })),
      selectImportantPerson: (id) => set({ selectedImportantPersonId: id, focusedPersonId: undefined }),
      setFocusedPerson: (id) => set({ focusedPersonId: id }),
      toggleImportantPeople: () => set((state) => ({ showImportantPeople: !state.showImportantPeople })),
      updatePerson: (id, patch) =>
        set((state) => ({
          people: { ...state.people, [id]: { ...state.people[id], ...patch } },
          ...withLog(state, `Обновлён профиль: ${state.people[id]?.firstName ?? id}`),
        })),
      updateImportantPerson: (id, patch) =>
        set((state) => ({
          importantPeople: { ...state.importantPeople, [id]: { ...state.importantPeople[id], ...patch } },
          ...withLog(state, `Обновлён важный человек: ${state.importantPeople[id]?.firstName ?? id}`),
        })),
      addParents: (childId) =>
        set((state) => {
          const child = state.people[childId];
          if (!child || child.parentCoupleId) return {};
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
      addImportantPerson: (target) =>
        set((state) => {
          const id = createId('important');
          const important: ImportantPerson = {
            id,
            firstName: 'Важный',
            lastName: 'человек',
            relationshipType: 'друг семьи',
            importance: 'Опишите, почему этот человек важен для семейной истории.',
            photoIds: [],
            videoIds: [],
            linkedTo: [target],
          };
          return {
            importantPeople: { ...state.importantPeople, [id]: important },
            selectedImportantPersonId: id,
            ...withLog(state, 'Добавлен важный человек'),
          };
        }),
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
      addMediaItem: (media) =>
        set((state) => ({
          media: { ...state.media, [media.id]: media },
          ...withLog(state, media.type === 'photo' ? 'Добавлено фото' : 'Добавлено видео'),
        })),
      updateMediaItem: (id, patch) =>
        set((state) => ({
          media: { ...state.media, [id]: { ...state.media[id], ...patch } },
          ...withLog(state, 'Обновлены медиа-метаданные'),
        })),
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
      importSnapshot: (snapshot) =>
        set((state) => ({
          ...snapshot,
          selectedPersonId: Object.keys(snapshot.people)[0] ?? 'me',
          ...withLog(state, 'Импортирован JSON-бэкап'),
        })),
      resetSeed: () => set((state) => ({ ...seedSnapshot, ...withLog(state, 'Данные сброшены к примеру') })),
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
        selectedPersonId: state.selectedPersonId,
        showImportantPeople: state.showImportantPeople,
        recentPersonIds: state.recentPersonIds,
        changeLog: state.changeLog,
      }),
    },
  ),
);

