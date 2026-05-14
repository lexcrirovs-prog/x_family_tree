import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import { useIsMuted } from '../../store/treeHoverStore';
import { getFullName, getInitials, getYears } from '../../utils/family';

type PersonNodeData = {
  personId: string;
  focused?: boolean;
  filterMuted?: boolean;
};

function AvatarThumb({
  personId,
  initials,
  onOpenGallery,
}: {
  personId: string;
  initials: string;
  onOpenGallery: () => void;
}) {
  const photoId = useFamilyStore(
    (state) =>
      state.people[personId]?.primaryPhotoId ?? state.people[personId]?.photoIds?.[0],
  );
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!photoId) {
      setUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    indexedDBMediaAdapter.getBlob(photoId).then((stored) => {
      if (cancelled || !stored) return;
      objectUrl = URL.createObjectURL(stored.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return (
    <button
      type="button"
      className="avatar avatar-button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenGallery();
      }}
      title="Открыть галерею по вехам жизни"
    >
      {url ? <img src={url} alt={initials} /> : <span>{initials}</span>}
    </button>
  );
}

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonNodeData>) {
  const person = useFamilyStore((state) => state.people[data.personId]);
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const addParents = useFamilyStore((state) => state.addParents);
  const addImportantPerson = useFamilyStore((state) => state.addImportantPerson);
  const muted = useIsMuted(data.personId) || data.filterMuted;
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  if (!person) return null;

  const isSelected = selectedPersonId === person.id;
  const isSoftDeleted = person.isDeleted;

  const className = [
    'person-node',
    `branch-${person.branch ?? 'self'}`,
    data.focused ? 'person-node-focused' : '',
    muted ? 'person-node-muted' : '',
    isSelected ? 'person-node-selected' : '',
    isSoftDeleted ? 'person-node-deleted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={(event) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const rx = Math.max(-8, Math.min(8, -y * 10));
        const ry = Math.max(-8, Math.min(8, x * 10));
        ref.current.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = '';
      }}
      onClick={() => selectPerson(person.id)}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="person-node-top">
        <AvatarThumb
          personId={person.id}
          initials={getInitials(person)}
          onOpenGallery={() => navigate(`/person/${person.id}/gallery`)}
        />
        <div className="person-node-copy">
          <strong>{getFullName(person)}</strong>
          <span>{getYears(person)}</span>
        </div>
      </div>
      <div className="person-node-actions">
        {!person.parentCoupleId && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              addParents(person.id);
            }}
            title="Добавить родителей"
          >
            <Plus size={13} />
            <span>Родители</span>
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            addImportantPerson({ type: 'person', id: person.id });
          }}
          title="+ Важные люди"
        >
          <Star size={13} />
          <span>Важные</span>
        </button>
        <Link to={`/person/${person.id}`} onClick={(event) => event.stopPropagation()}>
          Профиль
        </Link>
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export type { PersonNodeData };
