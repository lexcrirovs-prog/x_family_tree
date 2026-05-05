import { useRef } from 'react';
import { useStore } from '../store/store';
import { useMediaUrl } from '../hooks/useMediaUrl';

export function MediaUploader({
  attachToPersonId,
  attachToImportantId,
  attachToEventId,
  existingMediaIds,
  onChange,
  accept = 'image/*,video/*',
}: {
  attachToPersonId?: string;
  attachToImportantId?: string;
  attachToEventId?: string;
  existingMediaIds: string[];
  onChange: (ids: string[]) => void;
  accept?: string;
}) {
  const addMedia = useStore((s) => s.addMedia);
  const attachMediaToPerson = useStore((s) => s.attachMediaToPerson);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newIds: string[] = [];
    for (const file of Array.from(files)) {
      const id = await addMedia(file, { linkedEventId: attachToEventId });
      if (attachToPersonId) attachMediaToPerson(id, attachToPersonId, 'person');
      if (attachToImportantId) attachMediaToPerson(id, attachToImportantId, 'importantPerson');
      newIds.push(id);
    }
    onChange([...existingMediaIds, ...newIds]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {existingMediaIds.map((id) => (
          <MediaThumb
            key={id} id={id}
            onRemove={() => onChange(existingMediaIds.filter((x) => x !== id))}
          />
        ))}
        <button
          type="button"
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-2xl opacity-60 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => inputRef.current?.click()}
          aria-label="Добавить медиа"
        >+</button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

function MediaThumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useMediaUrl(id);
  const item = useStore((s) => s.media[id]);
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      {item?.type === 'video' ? (
        <video src={url} className="h-full w-full object-cover" muted />
      ) : (
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 px-1.5 text-xs text-white group-hover:block"
      >✕</button>
    </div>
  );
}
