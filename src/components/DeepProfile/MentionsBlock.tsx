import { useStore } from '../../store/store';

export function MentionsBlock({
  taggedInPhotos, mentionedInEvents,
}: { taggedInPhotos: string[]; mentionedInEvents: string[] }) {
  const events = useStore((s) => s.events);
  const media = useStore((s) => s.media);

  if (taggedInPhotos.length === 0 && mentionedInEvents.length === 0) return null;

  return (
    <section className="rounded-2xl border p-5"
             style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      <h2 className="mb-3 text-base font-medium">Где ещё упоминается</h2>
      {taggedInPhotos.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs uppercase tracking-wider opacity-60">На фото ({taggedInPhotos.length})</div>
          <ul className="space-y-1 text-sm">
            {taggedInPhotos.slice(0, 5).map((id) => (
              <li key={id} className="opacity-80">📷 {media[id]?.caption || id.slice(-6)}</li>
            ))}
          </ul>
        </div>
      )}
      {mentionedInEvents.length > 0 && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider opacity-60">В событиях ({mentionedInEvents.length})</div>
          <ul className="space-y-1 text-sm">
            {mentionedInEvents.slice(0, 5).map((id) => (
              <li key={id} className="opacity-80">📅 {events[id]?.title || id.slice(-6)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
