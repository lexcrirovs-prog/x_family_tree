export type Gender = 'male' | 'female';

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthYear?: number;
  deathYear?: number;
  bio?: string;
  photoIds: string[];
  videoIds: string[];
  parentCoupleId?: string;
  lifeEventIds: string[];
  isDeleted?: boolean;
  /** generation index relative to root (0 = root, negative = ancestors) */
  generation?: number;
};

export type Couple = {
  id: string;
  partnerAId: string;
  partnerBId: string;
  childrenIds: string[];
  marriageYear?: number;
  divorceYear?: number;
  lifeEventIds: string[];
  isDeleted?: boolean;
};

export type ImportantPerson = {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  deathYear?: number;
  bio?: string;
  importance: string;
  relationshipType: string;
  photoIds: string[];
  videoIds: string[];
  linkedTo: Array<{ type: 'person' | 'couple'; id: string }>;
  isDeleted?: boolean;
};

export type PhotoTag = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkedPersonId?: string;
  linkedPersonType?: 'person' | 'importantPerson';
  customName?: string;
  description?: string;
};

export type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  caption?: string;
  date?: string;
  yearTaken?: number;
  tags: PhotoTag[];
  linkedEventId?: string;
};

export type LifeEventType =
  | 'birth' | 'marriage' | 'childBirth' | 'death'
  | 'education' | 'work' | 'move' | 'achievement'
  | 'meeting' | 'travel' | 'custom';

export type LifeEvent = {
  id: string;
  ownerId: string;
  ownerType: 'person' | 'couple';
  type: LifeEventType;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  photoIds: string[];
  videoIds: string[];
  linkedEntities: Array<{
    type: 'person' | 'couple' | 'importantPerson' | 'event';
    id: string;
    role?: string;
  }>;
  isDeleted?: boolean;
};

export type Theme = 'dark' | 'light';
export type ViewMode = 'graph' | 'timeline' | 'fan';

export type AppData = {
  people: Record<string, Person>;
  couples: Record<string, Couple>;
  importantPeople: Record<string, ImportantPerson>;
  events: Record<string, LifeEvent>;
  media: Record<string, MediaItem>;
  rootPersonId?: string;
};
