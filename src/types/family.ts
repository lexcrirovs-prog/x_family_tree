export type Gender = 'male' | 'female';
export type OwnerType = 'person' | 'couple';
export type EntityLinkType = 'person' | 'couple' | 'importantPerson' | 'event';
export type ViewMode = 'graph' | 'timeline' | 'fan';
export type ThemeMode = 'dark' | 'light';

export type Person = {
  id: string;
  firstName: string;
  patronymic?: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthYear?: number;
  deathYear?: number;
  bio?: string;
  photoIds: string[];
  videoIds: string[];
  audioIds: string[];
  primaryPhotoId?: string;
  parentCoupleId?: string;
  lifeEventIds: string[];
  isDeleted?: boolean;
  generation: number;
  branch?: 'paternal' | 'maternal' | 'self' | 'spouse';
};

export type Couple = {
  id: string;
  partnerAId: string;
  partnerBId: string;
  childrenIds: string[];
  marriageYear?: number;
  divorceYear?: number;
  lifeEventIds: string[];
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
  linkedTo: Array<{
    type: 'person' | 'couple';
    id: string;
  }>;
};

export type PhotoTag = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkedPersonId?: string;
  linkedImportantPersonId?: string;
  customName?: string;
  description?: string;
};

export type MediaItem = {
  id: string;
  type: 'photo' | 'video' | 'audio';
  caption?: string;
  date?: string;
  yearTaken?: number;
  tags: PhotoTag[];
  linkedEventId?: string;
  ownerId?: string;
  storagePath?: string;
  durationSec?: number;
};

export type LifeEventType =
  | 'birth'
  | 'school'
  | 'marriage'
  | 'childBirth'
  | 'death'
  | 'education'
  | 'work'
  | 'retirement'
  | 'move'
  | 'achievement'
  | 'meeting'
  | 'travel'
  | 'memorable'
  | 'custom';

export type LifeEvent = {
  id: string;
  ownerId: string;
  ownerType: OwnerType;
  type: LifeEventType;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  photoIds: string[];
  videoIds: string[];
  audioIds: string[];
  linkedEntities: Array<{
    type: EntityLinkType;
    id: string;
    role?: string;
  }>;
};

export type ChangeLogEntry = {
  id: string;
  at: string;
  label: string;
};

export type FamilySnapshot = {
  people: Record<string, Person>;
  couples: Record<string, Couple>;
  importantPeople: Record<string, ImportantPerson>;
  events: Record<string, LifeEvent>;
  media: Record<string, MediaItem>;
};

