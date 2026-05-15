import type { Couple, FamilySnapshot, ImportantPerson, LifeEvent, Person } from '../types/family';

export function getFullName(
  person?: Pick<Person | ImportantPerson, 'firstName' | 'lastName'> & { patronymic?: string },
): string {
  if (!person) return 'Неизвестно';
  return [person.firstName, person.patronymic, person.lastName].filter(Boolean).join(' ');
}

export function getInitials(person?: Pick<Person | ImportantPerson, 'firstName' | 'lastName'>): string {
  if (!person) return '?';
  return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
}

export function getYears(entity?: Pick<Person | ImportantPerson, 'birthYear' | 'deathYear'>): string {
  if (!entity?.birthYear && !entity?.deathYear) return 'годы не указаны';
  return `${entity.birthYear ?? '?'} - ${entity.deathYear ?? 'н.в.'}`;
}

export function getAge(person: Person, nowYear = new Date().getFullYear()): number | undefined {
  if (!person.birthYear) return undefined;
  return (person.deathYear ?? nowYear) - person.birthYear;
}

export function activePeople(snapshot: FamilySnapshot): Person[] {
  return Object.values(snapshot.people).filter((person) => !person.isDeleted);
}

export function activeImportantPeople(snapshot: FamilySnapshot): ImportantPerson[] {
  return Object.values(snapshot.importantPeople).filter((p) => !p.isDeleted);
}

export function uniqueSurnames(snapshot: FamilySnapshot): string[] {
  const set = new Set<string>();
  for (const person of Object.values(snapshot.people)) {
    if (person.isDeleted) continue;
    if (person.lastName) set.add(person.lastName);
    if (person.maidenName) set.add(person.maidenName);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function personMatchesSurname(person: Person, surname: string): boolean {
  return person.lastName === surname || person.maidenName === surname;
}

/**
 * True only when the person's parentCoupleId points to an existing couple.
 * Guards against dangling references (e.g. data imported from seed where the
 * couple was never created), so we still show "+ Родители" in the UI.
 */
export function hasResolvedParents(snapshot: FamilySnapshot, personId: string): boolean {
  const person = snapshot.people[personId];
  if (!person?.parentCoupleId) return false;
  return Boolean(snapshot.couples[person.parentCoupleId]);
}

export const IMPORTANT_RELATIONS: ReadonlyArray<{ key: string; label: string; icon: string }> = [
  { key: 'отчим', label: 'Отчим', icon: '👨' },
  { key: 'мачеха', label: 'Мачеха', icon: '👩' },
  { key: 'крёстный', label: 'Крёстный', icon: '✝' },
  { key: 'крёстная', label: 'Крёстная', icon: '✝' },
  { key: 'наставник', label: 'Наставник', icon: '🎓' },
  { key: 'друг семьи', label: 'Друг семьи', icon: '🤝' },
  { key: 'няня', label: 'Няня', icon: '🍼' },
];

export function findCoupleByPartners(couples: Record<string, Couple>, a: string, b: string): Couple | undefined {
  return Object.values(couples).find(
    (couple) =>
      (couple.partnerAId === a && couple.partnerBId === b) || (couple.partnerAId === b && couple.partnerBId === a),
  );
}

export function getParents(snapshot: FamilySnapshot, personId: string): Person[] {
  const person = snapshot.people[personId];
  if (!person?.parentCoupleId) return [];
  const couple = snapshot.couples[person.parentCoupleId];
  if (!couple) return [];
  return [snapshot.people[couple.partnerAId], snapshot.people[couple.partnerBId]].filter(Boolean);
}

export function getSpouses(snapshot: FamilySnapshot, personId: string): Person[] {
  return Object.values(snapshot.couples)
    .filter((couple) => couple.partnerAId === personId || couple.partnerBId === personId)
    .map((couple) => snapshot.people[couple.partnerAId === personId ? couple.partnerBId : couple.partnerAId])
    .filter(Boolean);
}

export function getChildren(snapshot: FamilySnapshot, personId: string): Person[] {
  const childIds = Object.values(snapshot.couples)
    .filter((couple) => couple.partnerAId === personId || couple.partnerBId === personId)
    .flatMap((couple) => couple.childrenIds);

  return childIds.map((id) => snapshot.people[id]).filter(Boolean);
}

export function getSiblings(snapshot: FamilySnapshot, personId: string): Person[] {
  const person = snapshot.people[personId];
  if (!person?.parentCoupleId) return [];
  const parentCouple = snapshot.couples[person.parentCoupleId];
  if (!parentCouple) return [];
  return parentCouple.childrenIds.filter((id) => id !== personId).map((id) => snapshot.people[id]).filter(Boolean);
}

export function getEventsForPerson(snapshot: FamilySnapshot, personId: string): LifeEvent[] {
  const person = snapshot.people[personId];
  if (!person) return [];
  const direct = person.lifeEventIds.map((id) => snapshot.events[id]).filter(Boolean);
  const linked = Object.values(snapshot.events).filter((event) =>
    event.linkedEntities.some((entity) => entity.type === 'person' && entity.id === personId),
  );
  return uniqueById([...direct, ...linked]).sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
}

export function getImportantForPerson(snapshot: FamilySnapshot, personId: string): ImportantPerson[] {
  return Object.values(snapshot.importantPeople).filter((important) =>
    important.linkedTo.some((link) => link.type === 'person' && link.id === personId),
  );
}

export function getMentions(snapshot: FamilySnapshot, personId: string): Array<{ type: 'event' | 'photo'; id: string; label: string }> {
  const eventMentions = Object.values(snapshot.events)
    .filter((event) => event.linkedEntities.some((entity) => entity.type === 'person' && entity.id === personId))
    .map((event) => ({ type: 'event' as const, id: event.id, label: event.title }));

  const photoMentions = Object.values(snapshot.media)
    .filter((media) => media.tags.some((tag) => tag.linkedPersonId === personId))
    .map((media) => ({ type: 'photo' as const, id: media.id, label: media.caption || 'Фото с отметкой' }));

  return [...eventMentions, ...photoMentions];
}

export function generationLabel(generation: number): string {
  if (generation === 0) return 'Поколение 0';
  if (generation === -1) return 'Родители';
  if (generation === -2) return 'Бабушки и дедушки';
  if (generation === -3) return 'Прабабушки и прадедушки';
  if (generation === -4) return 'Прапрабабушки и прапрадедушки';
  return `Поколение ${generation}`;
}

export function eventIcon(type: LifeEvent['type']): string {
  const icons: Record<LifeEvent['type'], string> = {
    birth: '●',
    school: '✎',
    marriage: '◇',
    childBirth: '+',
    death: '×',
    education: '∴',
    work: '▦',
    military: '⚔',
    retirement: '☕',
    move: '↗',
    achievement: '★',
    meeting: '↔',
    travel: '⌁',
    memorable: '❖',
    custom: '•',
  };
  return icons[type];
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

