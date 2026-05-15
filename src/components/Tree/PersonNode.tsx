import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Plus, Star } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import { useFamilyStore } from '../../store/familyStore';
import { useIsMuted } from '../../store/treeHoverStore';
import { getFullName, getInitials, getYears, hasResolvedParents } from '../../utils/family';
import { kinshipLabel } from '../../utils/kinship';
import { uploadPhotoForPerson } from '../../utils/uploadPhoto';

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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

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
    <div className="avatar-wrap">
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
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            await uploadPhotoForPerson(personId, file, { makePrimary: true });
          } catch (err) {
            console.error(err);
          } finally {
            setUploading(false);
            e.currentTarget.value = '';
          }
        }}
      />
      <button
        type="button"
        className={`avatar-camera-overlay${uploading ? ' avatar-camera-busy' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          fileRef.current?.click();
        }}
        title="Загрузить или обновить главное фото"
        aria-label="Загрузить фото"
      >
        <Camera size={11} />
      </button>
    </div>
  );
}

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonNodeData>) {
  const person = useFamilyStore((state) => state.people[data.personId]);
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const addParents = useFamilyStore((state) => state.addParents);
  const addImportantPerson = useFamilyStore((state) => state.addImportantPerson);
  const kinshipMode = useFamilyStore((state) => state.kinshipMode);
  const kinshipAnchorId = useFamilyStore((state) => state.kinshipAnchorId);
  const setKinshipAnchor = useFamilyStore((state) => state.setKinshipAnchor);
  const allPeople = useFamilyStore((state) => state.people);
  const allCouples = useFamilyStore((state) => state.couples);
  const muted = useIsMuted(data.personId) || data.filterMuted;
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  if (!person) return null;

  const isSelected = selectedPersonId === person.id;
  const isSoftDeleted = person.isDeleted;
  const isAnchor = kinshipMode && kinshipAnchorId === person.id;
  const kinship =
    kinshipMode && kinshipAnchorId && kinshipAnchorId !== person.id
      ? kinshipLabel(
          {
            people: allPeople,
            couples: allCouples,
            importantPeople: {},
            events: {},
            media: {},
          },
          kinshipAnchorId,
          person.id,
        )
      : undefined;

  const className = [
    'person-node',
    `branch-${person.branch ?? 'self'}`,
    data.focused ? 'person-node-focused' : '',
    muted ? 'person-node-muted' : '',
    isSelected ? 'person-node-selected' : '',
    isSoftDeleted ? 'person-node-deleted' : '',
    isAnchor ? 'person-node-anchor' : '',
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
      onClick={() => {
        if (kinshipMode) {
          setKinshipAnchor(person.id);
        } else {
          selectPerson(person.id);
        }
      }}
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
      {kinship && <div className="kinship-chip">{kinship}</div>}
      {isAnchor && <div className="kinship-chip kinship-chip-anchor">← якорь</div>}
      <div className="person-node-actions">
        {!hasResolvedParents(
          { people: allPeople, couples: allCouples, importantPeople: {}, events: {}, media: {} },
          person.id,
        ) && (
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
