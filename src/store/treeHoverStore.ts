import { create } from 'zustand';
import type { FamilySnapshot } from '../types/family';

type HoverState = {
  hoveredId?: string;
  relatedIds: Set<string>;
  setHover: (id: string | undefined, snapshot: FamilySnapshot) => void;
  clear: () => void;
};

const EMPTY: Set<string> = new Set();

function computeRelated(id: string, snapshot: FamilySnapshot): Set<string> {
  const related = new Set<string>([id]);
  for (const couple of Object.values(snapshot.couples)) {
    const family = [couple.partnerAId, couple.partnerBId, ...couple.childrenIds];
    if (family.includes(id)) family.forEach((m) => related.add(m));
  }
  for (const important of Object.values(snapshot.importantPeople)) {
    if (important.id === id) {
      important.linkedTo.forEach((link) => related.add(link.id));
    }
    if (important.linkedTo.some((link) => link.id === id)) {
      related.add(important.id);
    }
  }
  return related;
}

export const useTreeHoverStore = create<HoverState>((set) => ({
  hoveredId: undefined,
  relatedIds: EMPTY,
  setHover: (id, snapshot) => {
    if (!id) {
      set({ hoveredId: undefined, relatedIds: EMPTY });
      return;
    }
    set({ hoveredId: id, relatedIds: computeRelated(id, snapshot) });
  },
  clear: () => set({ hoveredId: undefined, relatedIds: EMPTY }),
}));

export function useIsMuted(id: string): boolean {
  return useTreeHoverStore((s) => Boolean(s.hoveredId) && !s.relatedIds.has(id));
}
