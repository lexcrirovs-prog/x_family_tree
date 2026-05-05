import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Heart, UserRoundPlus } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';

type AddRelationNodeData = {
  targetId: string;
  action: 'parents' | 'spouse';
  label: string;
};

export const AddRelationNode = memo(function AddRelationNode({ data }: NodeProps<AddRelationNodeData>) {
  const addParents = useFamilyStore((state) => state.addParents);
  const addSpouse = useFamilyStore((state) => state.addSpouse);

  return (
    <div
      role="button"
      tabIndex={0}
      className="add-relation-node"
      onClick={() => {
        if (data.action === 'parents') addParents(data.targetId);
        if (data.action === 'spouse') addSpouse(data.targetId);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (data.action === 'parents') addParents(data.targetId);
        if (data.action === 'spouse') addSpouse(data.targetId);
      }}
    >
      <Handle type="source" position={Position.Bottom} className="node-handle" />
      <Handle type="target" position={Position.Top} className="node-handle" />
      {data.action === 'parents' ? <UserRoundPlus size={16} /> : <Heart size={16} />}
      <span>{data.label}</span>
    </div>
  );
});

export type { AddRelationNodeData };
