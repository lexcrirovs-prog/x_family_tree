import { useRef, useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/store';
import { Avatar } from '../Avatar';

export type PersonNodeData = {
  personId: string;
  highlighted?: boolean;
  dimmed?: boolean;
  hasSpouse?: boolean;
  onEdit: (id: string) => void;
  onAddParents?: (id: string) => void;
  onAddSpouse?: (id: string) => void;
  onAddChild?: (id: string) => void;
};

export function PersonNode(props: NodeProps) {
  const { personId, highlighted, dimmed, hasSpouse, onEdit, onAddParents, onAddSpouse, onAddChild } = props.data as unknown as PersonNodeData;
  const person = useStore((s) => s.people[personId]);
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovered, setHovered] = useState(false);

  if (!person) return null;

  const handleMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 16;
    const rx = (0.5 - py) * 16;
    setTilt({ rx, ry });
  };
  const handleLeave = () => { setTilt({ rx: 0, ry: 0 }); setHovered(false); };

  const generationColor = (() => {
    const g = person.generation ?? 0;
    if (g === 0) return '#7c9cff';
    if (g < 0) return `hsl(${220 - g * 8}, 35%, ${48 + g * 2}%)`;
    return `hsl(${20 + g * 8}, 55%, 56%)`;
  })();

  const fullName = `${person.firstName}${person.lastName ? ' ' + person.lastName : ''}`;
  const years = [person.birthYear, person.deathYear].filter(Boolean).join(' – ');
  const hasParents = !!person.parentCoupleId;

  const cardStyle: CSSProperties = {
    transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
    background: 'var(--color-panel)',
    borderColor: highlighted ? 'var(--color-accent)' : 'var(--color-border)',
    opacity: dimmed ? 0.3 : 1,
    transition: 'opacity 0.2s, border-color 0.2s, transform 0.12s',
  };

  const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {hovered && !hasParents && onAddParents && (
        <button
          className="nodrag absolute left-1/2 z-10 -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px]"
          style={{
            top: -22, background: 'var(--color-panel)', borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)',
          }}
          onMouseDown={stop}
          onClick={(e) => { stop(e); onAddParents(personId); }}
        >+ Родители</button>
      )}
      {hovered && onAddSpouse && (
        <button
          className="nodrag absolute top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px]"
          style={{
            right: -56, background: 'var(--color-panel)', borderColor: 'var(--color-accent-2)',
            color: 'var(--color-accent-2)',
          }}
          onMouseDown={stop}
          onClick={(e) => { stop(e); onAddSpouse(personId); }}
        >+ Супруг</button>
      )}
      {hovered && hasSpouse && onAddChild && (
        <button
          className="nodrag absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px]"
          style={{
            bottom: -22, background: 'var(--color-panel)', borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)',
          }}
          onMouseDown={stop}
          onClick={(e) => { stop(e); onAddChild(personId); }}
        >+ Ребёнок</button>
      )}

      <motion.div
        ref={cardRef}
        className="glow flex w-[180px] cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5"
        style={cardStyle}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleLeave}
        onClick={() => onEdit(personId)}
        onDoubleClick={(e) => { e.stopPropagation(); navigate(`/person/${personId}`); }}
        whileHover={{ scale: 1.03 }}
      >
        <div className="relative">
          <Avatar photoId={person.photoIds[0]} name={fullName} gender={person.gender} size={40} />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2"
            style={{ background: generationColor, boxShadow: '0 0 0 2px var(--color-panel)' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{fullName}</div>
          {years && <div className="truncate text-xs opacity-60">{years}</div>}
          {person.lifeEventIds.length > 0 && (
            <div className="mt-0.5 text-[10px] opacity-50">📅 {person.lifeEventIds.length}</div>
          )}
        </div>
      </motion.div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
