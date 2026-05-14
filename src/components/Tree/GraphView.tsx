import { useMemo } from 'react';
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
import { useFamilyStore } from '../../store/familyStore';
import { useTreeHoverStore } from '../../store/treeHoverStore';
import {
  activeImportantPeople,
  activePeople,
  getFullName,
  personMatchesSurname,
} from '../../utils/family';
import { PersonNode, type PersonNodeData } from './PersonNode';
import { ImportantNode, type ImportantNodeData } from './ImportantNode';

const nodeTypes = {
  person: PersonNode,
  important: ImportantNode,
};

export function GraphView() {
  const people = useFamilyStore((state) => state.people);
  const couples = useFamilyStore((state) => state.couples);
  const importantPeople = useFamilyStore((state) => state.importantPeople);
  const events = useFamilyStore((state) => state.events);
  const media = useFamilyStore((state) => state.media);
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const focusedPersonId = useFamilyStore((state) => state.focusedPersonId);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setPersonPosition = useFamilyStore((state) => state.setPersonPosition);
  const setImportantPosition = useFamilyStore((state) => state.setImportantPosition);
  const surnameFilter = useFamilyStore((state) => state.surnameFilter);
  const surnameFilterMode = useFamilyStore((state) => state.surnameFilterMode);
  const navigate = useNavigate();
  const setHover = useTreeHoverStore((s) => s.setHover);
  const hoveredId = useTreeHoverStore((s) => s.hoveredId);
  const relatedIds = useTreeHoverStore((s) => s.relatedIds);

  const surnameActive = Boolean(surnameFilter) && surnameFilterMode !== 'off';
  const filterFn = (matches: boolean): 'hide' | 'mute' | 'show' => {
    if (!surnameActive) return 'show';
    if (matches) return 'show';
    return surnameFilterMode === 'only' ? 'hide' : 'mute';
  };

  const nodes = useMemo(() => {
    const generationGap = 210;
    const xGap = 270;
    const top = 80;
    const snapshot = { people, couples, importantPeople, events, media };
    const peopleList = activePeople(snapshot);
    const importantsList = activeImportantPeople(snapshot);
    const generations = [...new Set(peopleList.map((p) => p.generation))].sort((a, b) => a - b);
    const list: Node<PersonNodeData | ImportantNodeData>[] = [];

    generations.forEach((generation, generationIndex) => {
      const inGeneration = peopleList
        .filter((p) => p.generation === generation)
        .sort((a, b) => {
          const branchOrder = String(a.branch).localeCompare(String(b.branch));
          return branchOrder || getFullName(a).localeCompare(getFullName(b));
        });
      const startX = 120 - ((inGeneration.length - 1) * xGap) / 2;
      inGeneration.forEach((person, index) => {
        const matches = surnameFilter ? personMatchesSurname(person, surnameFilter) : true;
        const verdict = filterFn(matches);
        if (verdict === 'hide') return;
        const auto = {
          x: startX + index * xGap + 720,
          y: top + generationIndex * generationGap,
        };
        list.push({
          id: person.id,
          type: 'person',
          data: {
            personId: person.id,
            focused: focusedPersonId === person.id,
            filterMuted: verdict === 'mute',
          },
          position: person.customPosition ?? auto,
        });
      });
    });

    if (showImportantPeople) {
      importantsList.forEach((important, index) => {
        const firstLink = important.linkedTo[0];
        const linkedPerson = firstLink?.type === 'person' ? people[firstLink.id] : undefined;
        // Important persons match if linked person matches.
        const matches = surnameFilter
          ? linkedPerson
            ? personMatchesSurname(linkedPerson, surnameFilter)
            : false
          : true;
        const verdict = filterFn(matches);
        if (verdict === 'hide') return;
        const y = linkedPerson
          ? top + generations.indexOf(linkedPerson.generation) * generationGap + 42
          : top + 120;
        list.push({
          id: important.id,
          type: 'important',
          data: { importantId: important.id, filterMuted: verdict === 'mute' },
          position: important.customPosition ?? { x: 260 + index * 190, y },
        });
      });
    }

    return list;
  }, [
    couples,
    events,
    focusedPersonId,
    importantPeople,
    media,
    people,
    showImportantPeople,
    surnameFilter,
    surnameFilterMode,
  ]);

  const edges = useMemo(() => {
    const list: Edge[] = [];
    const isVisible = (id: string): boolean => nodes.some((n) => n.id === id);

    Object.values(couples).forEach((couple) => {
      if (!isVisible(couple.partnerAId) || !isVisible(couple.partnerBId)) {
        if (surnameFilterMode === 'only') return;
      }
      list.push({
        id: `spouse-${couple.id}`,
        source: couple.partnerAId,
        target: couple.partnerBId,
        type: 'smoothstep',
        animated: hoveredId === couple.partnerAId || hoveredId === couple.partnerBId,
        className:
          hoveredId && !relatedIds.has(couple.partnerAId) && !relatedIds.has(couple.partnerBId)
            ? 'edge-muted'
            : 'edge-spouse',
        style: { strokeWidth: 1.8 },
      });
      couple.childrenIds.forEach((childId) => {
        if (surnameFilterMode === 'only' && !isVisible(childId)) return;
        [couple.partnerAId, couple.partnerBId].forEach((parentId) => {
          if (surnameFilterMode === 'only' && !isVisible(parentId)) return;
          list.push({
            id: `parent-${parentId}-${childId}`,
            source: parentId,
            target: childId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
            animated: hoveredId === parentId || hoveredId === childId,
            className:
              hoveredId && !relatedIds.has(parentId) && !relatedIds.has(childId)
                ? 'edge-muted'
                : 'edge-parent',
            style: { strokeWidth: 1.4 },
          });
        });
      });
    });

    if (showImportantPeople) {
      Object.values(importantPeople).forEach((important) => {
        if (important.isDeleted) return;
        if (surnameFilterMode === 'only' && !isVisible(important.id)) return;
        important.linkedTo.forEach((link) => {
          if (surnameFilterMode === 'only' && !isVisible(link.id)) return;
          list.push({
            id: `important-${important.id}-${link.id}`,
            source: important.id,
            target: link.id,
            type: 'smoothstep',
            className:
              hoveredId && !relatedIds.has(important.id) && !relatedIds.has(link.id)
                ? 'edge-muted'
                : 'edge-important',
            style: { strokeDasharray: '6 6', strokeWidth: 1.5 },
          });
        });
      });
    }
    return list;
  }, [couples, hoveredId, importantPeople, nodes, relatedIds, showImportantPeople, surnameFilterMode]);

  const handleEnter: NodeMouseHandler = (_, node) => {
    setHover(node.id, { people, couples, importantPeople, events, media });
  };
  const handleLeave: NodeMouseHandler = () =>
    setHover(undefined, { people, couples, importantPeople, events, media });

  return (
    <div className="tree-surface graph-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (people[node.id]) selectPerson(node.id);
        }}
        onNodeDoubleClick={(_, node) => {
          if (people[node.id]) navigate(`/person/${node.id}`);
        }}
        onNodeMouseEnter={handleEnter}
        onNodeMouseLeave={handleLeave}
        onNodeDragStop={(_, node) => {
          if (people[node.id]) {
            setPersonPosition(node.id, node.position.x, node.position.y);
          } else if (importantPeople[node.id]) {
            setImportantPosition(node.id, node.position.x, node.position.y);
          }
        }}
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
    </div>
  );
}
