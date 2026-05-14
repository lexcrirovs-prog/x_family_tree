import { useFamilyStore } from './familyStore';
import type { FamilySnapshot } from '../types/family';

type Snapshot = FamilySnapshot;

const stack: Snapshot[] = [];
const MAX = 30;
let lastPushAt = 0;
const DEBOUNCE_MS = 500;
let installed = false;
let suppress = false;

function takeSnapshot(): Snapshot {
  const s = useFamilyStore.getState();
  return {
    people: s.people,
    couples: s.couples,
    importantPeople: s.importantPeople,
    events: s.events,
    media: s.media,
  };
}

function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  return (
    a.people === b.people &&
    a.couples === b.couples &&
    a.importantPeople === b.importantPeople &&
    a.events === b.events &&
    a.media === b.media
  );
}

export function installUndoStack(): () => void {
  if (installed) return () => undefined;
  installed = true;
  let prev = takeSnapshot();
  const unsubscribe = useFamilyStore.subscribe((state) => {
    if (suppress) return;
    const current: Snapshot = {
      people: state.people,
      couples: state.couples,
      importantPeople: state.importantPeople,
      events: state.events,
      media: state.media,
    };
    if (snapshotsEqual(current, prev)) return;
    const now = Date.now();
    // Debounce: collapse rapid edits (typing) into one entry.
    if (now - lastPushAt < DEBOUNCE_MS && stack.length > 0) {
      // overwrite the most recent stack entry with prev (still represents "before this burst")
      // i.e. don't push; just update prev.
      prev = current;
      return;
    }
    stack.push(prev);
    if (stack.length > MAX) stack.shift();
    lastPushAt = now;
    prev = current;
  });
  return () => {
    installed = false;
    unsubscribe();
  };
}

export function canUndo(): boolean {
  return stack.length > 0;
}

export function undo(): boolean {
  const previous = stack.pop();
  if (!previous) return false;
  suppress = true;
  useFamilyStore.setState({
    people: previous.people,
    couples: previous.couples,
    importantPeople: previous.importantPeople,
    events: previous.events,
    media: previous.media,
  });
  // Allow next subscription to run normally
  setTimeout(() => {
    suppress = false;
  }, 50);
  return true;
}

export function getUndoDepth(): number {
  return stack.length;
}
