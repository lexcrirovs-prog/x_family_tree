import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Link } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import { useIsMuted } from '../../store/treeHoverStore';
import { getInitials } from '../../utils/family';

type ImportantNodeData = {
  importantId: string;
};

export const ImportantNode = memo(function ImportantNode({ data }: NodeProps<ImportantNodeData>) {
  const important = useFamilyStore((state) => state.importantPeople[data.importantId]);
  const selectImportantPerson = useFamilyStore((state) => state.selectImportantPerson);
  const muted = useIsMuted(data.importantId);

  if (!important) return null;

  return (
    <div
      className={muted ? 'important-node important-node-muted' : 'important-node'}
      onClick={() => selectImportantPerson(important.id)}
    >
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="important-diamond">{getInitials(important)}</div>
      <strong>
        {important.firstName} {important.lastName}
      </strong>
      <span>{important.relationshipType}</span>
      <Link to={`/important-person/${important.id}`} onClick={(event) => event.stopPropagation()}>
        Профиль
      </Link>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export type { ImportantNodeData };
