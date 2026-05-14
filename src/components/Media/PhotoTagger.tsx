import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import type { MediaItem, PhotoTag } from '../../types/family';
import { getFullName } from '../../utils/family';
import { createId } from '../../utils/ids';

type PhotoTaggerProps = {
  media: MediaItem;
};

export function PhotoTagger({ media }: PhotoTaggerProps) {
  const people = useFamilyStore((state) => state.people);
  const updateMediaItem = useFamilyStore((state) => state.updateMediaItem);
  const [url, setUrl] = useState<string | undefined>();
  const [tagMode, setTagMode] = useState(false);
  const [draft, setDraft] = useState<PhotoTag | undefined>();

  useEffect(() => {
    let objectUrl: string | undefined;
    indexedDBMediaAdapter.getBlob(media.id).then((stored) => {
      if (!stored) return;
      objectUrl = URL.createObjectURL(stored.blob);
      setUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.id]);

  if (!url) {
    return (
      <div className="photo-placeholder">
        <Tag size={18} />
        <span>{media.caption || 'Фото загружается…'}</span>
      </div>
    );
  }

  return (
    <div className="photo-tagger">
      <div className="photo-tagger-toolbar">
        <strong>{media.caption || 'Фото'}</strong>
        <button type="button" onClick={() => setTagMode((value) => !value)}>
          {tagMode ? 'Просмотр' : 'Режим тегирования'}
        </button>
      </div>
      <div
        className={tagMode ? 'photo-canvas tagging' : 'photo-canvas'}
        onClick={(event) => {
          if (!tagMode) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          setDraft({
            id: createId('tag'),
            x: Math.max(0, x - 6),
            y: Math.max(0, y - 6),
            width: 12,
            height: 12,
            customName: 'Новая отметка',
            description: 'Выберите человека или подпишите вручную.',
          });
        }}
      >
        <img src={url} alt={media.caption || 'Семейное фото'} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {[...media.tags, ...(draft ? [draft] : [])].map((tag) => (
            <g key={tag.id} className="photo-tag">
              <rect x={tag.x} y={tag.y} width={tag.width} height={tag.height} />
            </g>
          ))}
        </svg>
        <div className="tag-list">
          {media.tags.map((tag) => {
            const person = tag.linkedPersonId ? people[tag.linkedPersonId] : undefined;
            return person ? (
              <Link key={tag.id} to={`/person/${person.id}`}>
                {getFullName(person)}
              </Link>
            ) : (
              <span key={tag.id}>{tag.customName}</span>
            );
          })}
        </div>
      </div>
      {draft && (
        <div className="tag-editor">
          <select
            value={draft.linkedPersonId ?? ''}
            onChange={(event) => {
              const linkedPersonId = event.target.value || undefined;
              setDraft({
                ...draft,
                linkedPersonId,
                customName: linkedPersonId ? undefined : draft.customName,
              });
            }}
          >
            <option value="">Подписать вручную</option>
            {Object.values(people).map((person) => (
              <option key={person.id} value={person.id}>
                {getFullName(person)}
              </option>
            ))}
          </select>
          <input
            value={draft.customName ?? ''}
            onChange={(event) => setDraft({ ...draft, customName: event.target.value })}
          />
          <button
            type="button"
            onClick={() => {
              updateMediaItem(media.id, { tags: [...media.tags, draft] });
              setDraft(undefined);
            }}
          >
            Сохранить тег
          </button>
        </div>
      )}
    </div>
  );
}
