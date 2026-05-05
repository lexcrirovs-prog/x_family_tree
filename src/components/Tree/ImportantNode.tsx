import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';

export function ImportantNode(props: NodeProps) {
  const { importantId } = props.data as unknown as { importantId: string };
  const ip = useStore((s) => s.importantPeople[importantId]);
  const navigate = useNavigate();
  if (!ip) return null;
  const fullName = `${ip.firstName} ${ip.lastName}`.trim();
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="cursor-pointer"
        style={{
          width: 90, height: 90,
          transform: 'rotate(45deg)',
          background: 'var(--color-panel)',
          border: '1.5px dashed var(--color-accent)',
          borderRadius: 12,
        }}
        onDoubleClick={() => navigate(`/important-person/${ip.id}`)}
      >
        <div
          className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] leading-tight"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="opacity-60">{ip.relationshipType}</div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
