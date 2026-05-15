import type { Person } from '../types/family';

export const TIMELINE_START = 1850;
export const TIMELINE_END = new Date().getFullYear() + 5;
export const PX_PER_YEAR = 16;

export function yearToY(year: number): number {
  return (year - TIMELINE_START) * PX_PER_YEAR;
}

/**
 * Returns the year a person should be placed at on the vertical timeline.
 * Uses real birthYear when present, otherwise estimates from the
 * generation offset relative to a reference year (defaults to person "me"
 * year if available, else 1990).
 */
export function effectiveYear(
  person: Person | undefined,
  people: Record<string, Person>,
): number {
  if (!person) return new Date().getFullYear();
  if (person.birthYear) return person.birthYear;
  const refYear = people.me?.birthYear ?? 1990;
  return Math.round(refYear + (person.generation ?? 0) * 25);
}

export const TIMELINE_LEFT_GUTTER = 64; // px reserved for the axis labels
