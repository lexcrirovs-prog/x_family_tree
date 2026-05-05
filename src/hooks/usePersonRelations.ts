import { useStore } from '../store/store';
import type { Couple, Person } from '../types';

export function usePersonRelations(personId?: string) {
  return useStore((s) => {
    if (!personId) return null;
    const me = s.people[personId];
    if (!me) return null;

    const parentCouple: Couple | undefined = me.parentCoupleId ? s.couples[me.parentCoupleId] : undefined;
    const father = parentCouple ? s.people[parentCouple.partnerAId] : undefined;
    const mother = parentCouple ? s.people[parentCouple.partnerBId] : undefined;

    const siblings: Person[] = parentCouple
      ? parentCouple.childrenIds.filter((id) => id !== personId).map((id) => s.people[id]).filter(Boolean)
      : [];

    const spouseCouples: Couple[] = Object.values(s.couples).filter(
      (c) => !c.isDeleted && (c.partnerAId === personId || c.partnerBId === personId)
    );
    const spouses: Person[] = spouseCouples
      .map((c) => (c.partnerAId === personId ? c.partnerBId : c.partnerAId))
      .map((id) => s.people[id])
      .filter(Boolean);
    const children: Person[] = spouseCouples.flatMap((c) => c.childrenIds.map((id) => s.people[id]).filter(Boolean));

    const importantPeople = Object.values(s.importantPeople).filter(
      (ip) => !ip.isDeleted && ip.linkedTo.some((l) => l.type === 'person' && l.id === personId)
    );

    // backlinks: where else mentioned
    const taggedInPhotos = Object.values(s.media)
      .filter((m) => m.type === 'photo' && m.tags.some((t) => t.linkedPersonId === personId))
      .map((m) => m.id);
    const mentionedInEvents = Object.values(s.events)
      .filter((e) => !e.isDeleted && e.ownerId !== personId
        && e.linkedEntities.some((le) => le.type === 'person' && le.id === personId))
      .map((e) => e.id);

    return {
      person: me,
      parentCouple, father, mother, siblings,
      spouseCouples, spouses, children,
      importantPeople,
      taggedInPhotos, mentionedInEvents,
    };
  });
}
