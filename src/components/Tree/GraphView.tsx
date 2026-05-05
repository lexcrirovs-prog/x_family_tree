import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from 'reactflow';
import { AnimatePresence, motion } from 'framer-motion';
import { useFamilyStore } from '../../store/familyStore';
import { activePeople, getFullName } from '../../utils/family';
import { PersonNode, type PersonNodeData } from './PersonNode';
import { ImportantNode, type ImportantNodeData } from './ImportantNode';

const nodeTypes = {
  person: PersonNode,
  important: ImportantNode,
};

export function GraphView() {
  const snapshot = useFamilyStore((state) => state.snapshot());
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const focusedPersonId = useFamilyStore((state) => state.focusedPersonId);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const navigate = useNavigate();
  const [hoveredNode, setHoveredNode] = useState<string | undefined>();

  const relatedIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const related = new Set<string>([hoveredNode]);
    Object.values(snapshot.couples).forEach((couple) => {
      const family = [couple.partnerAId, couple.partnerBId, ...couple.childrenIds];
      if (family.includes(hoveredNode)) family.forEach((id) => related.add(id));
    });
    Object.values(snapshot.importantPeople).forEach((important) => {
      if (important.id === hoveredNode) {
        important.linkedTo.forEach((link) => related.add(link.id));
      }
      if (important.linkedTo.some((link) => link.id === hoveredNode)) related.add(important.id);
    });
    return related;
  }, [hoveredNode, snapshot.couples, snapshot.importantPeople]);

  const { nodes, edges } = useMemo(() => {
    const generationGap = 210;
    const xGap = 270;
    const top = 80;
    const people = activePeople(snapshot);
    const generations = [...new Set(people.map((person) => person.generation))].sort((a, b) => a - b);
    const nodes: Node<PersonNodeData | ImportantNodeData>[] = [];
    const edges: Edge[] = [];

    generations.forEach((generation, generationIndex) => {
      const inGeneration = people
        .filter((person) => person.generation === generation)
        .sort((a, b) => {
          const branchOrder = String(a.branch).localeCompare(String(b.branch));
          return branchOrder || getFullName(a).localeCompare(getFullName(b));
        });
      const startX = 120 - ((inGeneration.length - 1) * xGap) / 2;
      inGeneration.forEach((person, index) => {
        const muted = hoveredNode ? !relatedIds.has(person.id) : false;
        nodes.push({
          id: person.id,
          type: 'person',
          data: {
            personId: person.id,
            focused: focusedPersonId === person.id,
            muted,
          },
          position: {
            x: startX + index * xGap + 720,
            y: top + generationIndex * generationGap,
          },
        });
      });
    });

    Object.values(snapshot.couples).forEach((couple) => {
      edges.push({
        id: `spouse-${couple.id}`,
        source: couple.partnerAId,
        target: couple.partnerBId,
        type: 'smoothstep',
        animated: hoveredNode === couple.partnerAId || hoveredNode === couple.partnerBId,
        className: hoveredNode && !relatedIds.has(couple.partnerAId) && !relatedIds.has(couple.partnerBId) ? 'edge-muted' : 'edge-spouse',
        style: { strokeWidth: 1.8 },
      });

      couple.childrenIds.forEach((childId) => {
        [couple.partnerAId, couple.partnerBId].forEach((parentId) => {
          edges.push({
            id: `parent-${parentId}-${childId}`,
            source: parentId,
            target: childId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
            animated: hoveredNode === parentId || hoveredNode === childId,
            className: hoveredNode && !relatedIds.has(parentId) && !relatedIds.has(childId) ? 'edge-muted' : 'edge-parent',
            style: { strokeWidth: 1.4 },
          });
        });
      });
    });

    if (showImportantPeople) {
      Object.values(snapshot.importantPeople).forEach((important, index) => {
        const firstLink = important.linkedTo[0];
        const linkedPerson = firstLink?.type === 'person' ? snapshot.people[firstLink.id] : undefined;
        const y = linkedPerson ? top + generations.indexOf(linkedPerson.generation) * generationGap + 42 : top + 120;
        nodes.push({
          id: important.id,
          type: 'important',
          data: {
            importantId: important.id,
            muted: hoveredNode ? !relatedIds.has(important.id) : false,
          },
          position: { x: 260 + index * 190, y },
        });
        important.linkedTo.forEach((link) => {
          edges.push({
            id: `important-${important.id}-${link.id}`,
            source: important.id,
            target: link.id,
            type: 'smoothstep',
            className: hoveredNode && !relatedIds.has(important.id) && !relatedIds.has(link.id) ? 'edge-muted' : 'edge-important',
            style: { strokeDasharray: '6 6', strokeWidth: 1.5 },
          });
        });
      });
    }

    return { nodes, edges };
  }, [focusedPersonId, hoveredNode, relatedIds, showImportantPeople, snapshot]);

  const handleEnter: NodeMouseHandler = (_, node) => setHoveredNode(node.id);
  const handleLeave: NodeMouseHandler = () => setHoveredNode(undefined);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="graph"
        className="tree-surface graph-surface"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            if (snapshot.people[node.id]) selectPerson(node.id);
          }}
          onNodeDoubleClick={(_, node) => {
            if (snapshot.people[node.id]) navigate(`/person/${node.id}`);
          }}
          onNodeMouseEnter={handleEnter}
          onNodeMouseLeave={handleLeave}
          onPaneClick={() => setFocusedPerson(undefined)}
          fitView
          minZoom={0.25}
          maxZoom={1.5}
          nodesDraggable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={28} size={1} color="rgba(255,255,255,.08)" />
          <MiniMap pannable zoomable className="mini-map" />
          <Controls className="flow-controls" />
        </ReactFlow>
      </motion.div>
    </AnimatePresence>
  );
}

