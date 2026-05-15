import type { FamilySnapshot, Person } from '../types/family';

type Sex = 'male' | 'female';

/**
 * Maps a generation difference (positive = ancestor) into a Russian kinship
 * term. Negative numbers (descendants) use the descendants table.
 */
function ancestorTerm(steps: number, sex: Sex): string {
  if (steps === 1) return sex === 'male' ? 'отец' : 'мать';
  if (steps === 2) return sex === 'male' ? 'дедушка' : 'бабушка';
  if (steps === 3) return sex === 'male' ? 'прадед' : 'прабабушка';
  if (steps === 4) return sex === 'male' ? 'прапрадед' : 'прапрабабушка';
  return sex === 'male' ? `пращур (${steps} поколений)` : `пращурка (${steps} поколений)`;
}

function descendantTerm(steps: number, sex: Sex): string {
  if (steps === 1) return sex === 'male' ? 'сын' : 'дочь';
  if (steps === 2) return sex === 'male' ? 'внук' : 'внучка';
  if (steps === 3) return sex === 'male' ? 'правнук' : 'правнучка';
  if (steps === 4) return sex === 'male' ? 'праправнук' : 'праправнучка';
  return sex === 'male' ? `потомок (${steps} поколений)` : `потомок (${steps} поколений)`;
}

function siblingTerm(sex: Sex, full: boolean): string {
  if (full) return sex === 'male' ? 'брат' : 'сестра';
  return sex === 'male' ? 'единокровный брат' : 'единоутробная сестра';
}

function cousinTerm(degree: number, sex: Sex): string {
  // degree: 1 — двоюродный, 2 — троюродный, 3 — четвероюродный …
  const map = ['двоюродный', 'троюродный', 'четвероюродный', 'пятиюродный'];
  const prefix = map[degree - 1] ?? `${degree + 1}-юродный`;
  return `${prefix} ${sex === 'male' ? 'брат' : 'сестра'}`;
}

function parentSiblingTerm(sex: Sex): string {
  return sex === 'male' ? 'дядя' : 'тётя';
}

function nephewTerm(sex: Sex): string {
  return sex === 'male' ? 'племянник' : 'племянница';
}

function getParentIds(snapshot: FamilySnapshot, personId: string): string[] {
  const person = snapshot.people[personId];
  if (!person?.parentCoupleId) return [];
  const couple = snapshot.couples[person.parentCoupleId];
  if (!couple) return [];
  return [couple.partnerAId, couple.partnerBId].filter((id) => snapshot.people[id]);
}

function spouseIds(snapshot: FamilySnapshot, personId: string): string[] {
  return Object.values(snapshot.couples)
    .filter((c) => c.partnerAId === personId || c.partnerBId === personId)
    .map((c) => (c.partnerAId === personId ? c.partnerBId : c.partnerAId))
    .filter((id) => snapshot.people[id]);
}

function ancestorMap(snapshot: FamilySnapshot, personId: string, maxDepth = 6): Map<string, number> {
  const result = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: personId, depth: 0 }];
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (result.has(id) && result.get(id)! <= depth) continue;
    result.set(id, depth);
    if (depth >= maxDepth) continue;
    for (const pid of getParentIds(snapshot, id)) {
      queue.push({ id: pid, depth: depth + 1 });
    }
  }
  return result;
}

function bloodRelation(
  snapshot: FamilySnapshot,
  anchorId: string,
  otherId: string,
): string | undefined {
  if (anchorId === otherId) return 'это вы';
  const anchor = snapshot.people[anchorId];
  const other = snapshot.people[otherId];
  if (!anchor || !other) return undefined;
  const anchorAncestors = ancestorMap(snapshot, anchorId);
  const otherAncestors = ancestorMap(snapshot, otherId);
  // Direct ancestor / descendant
  if (anchorAncestors.has(otherId)) {
    return ancestorTerm(anchorAncestors.get(otherId)!, other.gender as Sex);
  }
  if (otherAncestors.has(anchorId)) {
    return descendantTerm(otherAncestors.get(anchorId)!, other.gender as Sex);
  }
  // Find common ancestor with minimal max-depth.
  let best: { anchorDepth: number; otherDepth: number } | undefined;
  for (const [id, ad] of anchorAncestors) {
    const od = otherAncestors.get(id);
    if (od === undefined) continue;
    if (!best || Math.max(ad, od) < Math.max(best.anchorDepth, best.otherDepth)) {
      best = { anchorDepth: ad, otherDepth: od };
    }
  }
  if (!best) return undefined;
  const { anchorDepth: a, otherDepth: o } = best;
  // Siblings (a===1, o===1): check full vs half
  if (a === 1 && o === 1) {
    const anchorParents = new Set(getParentIds(snapshot, anchorId));
    const otherParents = new Set(getParentIds(snapshot, otherId));
    let common = 0;
    for (const p of anchorParents) if (otherParents.has(p)) common++;
    return siblingTerm(other.gender as Sex, common >= 2);
  }
  // Uncle/Aunt (anchor's parent is sibling of other)
  if (a > 1 && o === 1) {
    // other is sibling of an anchor's ancestor at depth (a-1)
    if (a === 2) return parentSiblingTerm(other.gender as Sex);
    // grand-uncle/aunt etc.
    return other.gender === 'male' ? 'двоюродный дед' : 'двоюродная бабка';
  }
  if (a === 1 && o > 1) {
    if (o === 2) return nephewTerm(other.gender as Sex);
    return other.gender === 'male' ? 'внучатый племянник' : 'внучатая племянница';
  }
  // Cousins
  if (a === o) {
    return cousinTerm(a - 1, other.gender as Sex);
  }
  // Cousin once removed
  const cousinDeg = Math.min(a, o) - 1;
  if (cousinDeg >= 1) {
    const removed = Math.abs(a - o);
    const base = cousinTerm(cousinDeg, other.gender as Sex);
    return `${base} ${removed === 1 ? 'один раз отстоящий' : `${removed} раз отстоящий`}`;
  }
  return undefined;
}

function inLawRelation(
  snapshot: FamilySnapshot,
  anchorId: string,
  otherId: string,
): string | undefined {
  const anchor = snapshot.people[anchorId];
  const other = snapshot.people[otherId];
  if (!anchor || !other) return undefined;
  const anchorSex = anchor.gender as Sex;
  const otherSex = other.gender as Sex;

  // Direct spouse
  if (spouseIds(snapshot, anchorId).includes(otherId)) {
    return otherSex === 'male' ? 'муж' : 'жена';
  }
  // Parents-in-law: other is parent of anchor's spouse
  const anchorSpouses = spouseIds(snapshot, anchorId);
  for (const sp of anchorSpouses) {
    if (getParentIds(snapshot, sp).includes(otherId)) {
      if (anchorSex === 'male') {
        return otherSex === 'male' ? 'тесть' : 'тёща';
      }
      return otherSex === 'male' ? 'свёкор' : 'свекровь';
    }
  }
  // Sibling-in-law: other is sibling of anchor's spouse
  for (const sp of anchorSpouses) {
    const spAncestors = getParentIds(snapshot, sp);
    if (spAncestors.length > 0) {
      const otherAncestors = getParentIds(snapshot, otherId);
      const common = otherAncestors.filter((p) => spAncestors.includes(p)).length;
      if (common > 0 && sp !== otherId) {
        const spousePerson = snapshot.people[sp];
        if (!spousePerson) continue;
        const spouseSex = spousePerson.gender as Sex;
        if (spouseSex === 'male') {
          // anchor's husband's brother = деверь; sister = золовка
          return otherSex === 'male' ? 'деверь' : 'золовка';
        }
        return otherSex === 'male' ? 'шурин' : 'свояченица';
      }
    }
  }
  // Child-in-law: other is spouse of anchor's child
  const otherSpouses = spouseIds(snapshot, otherId);
  for (const os of otherSpouses) {
    const osParents = getParentIds(snapshot, os);
    if (osParents.includes(anchorId)) {
      return otherSex === 'male' ? 'зять' : 'невестка';
    }
  }
  // Sibling's spouse: other is spouse of anchor's sibling
  const anchorParents = getParentIds(snapshot, anchorId);
  for (const os of otherSpouses) {
    const osParents = getParentIds(snapshot, os);
    const common = osParents.filter((p) => anchorParents.includes(p)).length;
    if (common > 0 && os !== anchorId) {
      return otherSex === 'male' ? 'муж сестры' : 'жена брата';
    }
  }
  return undefined;
}

export function kinshipLabel(
  snapshot: FamilySnapshot,
  anchorId: string | undefined,
  otherId: string,
): string | undefined {
  if (!anchorId) return undefined;
  if (anchorId === otherId) return 'это вы';
  const blood = bloodRelation(snapshot, anchorId, otherId);
  if (blood) return blood;
  const inLaw = inLawRelation(snapshot, anchorId, otherId);
  if (inLaw) return inLaw;
  return undefined;
}
