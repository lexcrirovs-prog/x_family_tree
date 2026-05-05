import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getInitials, getYears } from '../../utils/family';

type PersonNodeData = {
  personId: string;
  focused?: boolean;
  muted?: boolean;
};

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonNodeData>) {
  const person = useFamilyStore((state) => state.people[data.personId]);
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const addParents = useFamilyStore((state) => state.addParents);
  const addImportantPerson = useFamilyStore((state) => state.addImportantPerson);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  if (!person) return null;

  const isSelected = selectedPersonId === person.id;
  const isSoftDeleted = person.isDeleted;

  return (
    <motion.div
      className={[
        'person-node',
        `branch-${person.branch ?? 'self'}`,
        data.focused ? 'person-node-focused' : '',
        data.muted ? 'person-node-muted' : '',
        isSelected ? 'person-node-selected' : '',
        isSoftDeleted ? 'person-node-deleted' : '',
      ].join(' ')}
      style={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        transformPerspective: 1000,
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: Math.max(-8, Math.min(8, -y * 10)), y: Math.max(-8, Math.min(8, x * 10)) });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={() => selectPerson(person.id)}
      layout
    >
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="person-node-top">
        <div className="avatar">{getInitials(person)}</div>
        <div className="person-node-copy">
          <strong>
            {person.firstName} {person.lastName}
          </strong>
          <span>{getYears(person)}</span>
        </div>
      </div>
      <div className="person-node-actions">
        {!person.parentCoupleId && (
          <button type="button" onClick={(event) => { event.stopPropagation(); addParents(person.id); }} title="Добавить родителей">
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
    </motion.div>
  );
});

export type { PersonNodeData };

