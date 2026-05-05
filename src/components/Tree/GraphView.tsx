import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  applyNodeChanges,
  type Node, type Edge, type NodeChange,
} from '@xyflow/react';
import dagre from 'dagre';
import { useStore } from '../../store/store';
import { PersonNode } from './PersonNode';
import { ImportantNode } from './ImportantNode';
import type { Person } from '../../types';
import { AddRelativeModal } from '../AddRelativeModal';

const NODE_W = 200;
const NODE_H = 70;
const GEN_GAP = 140;

function layout(nodes: Node[], edges: Edge[], generations: Map<string, number>) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: GEN_GAP });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  // Compute generation y baselines
  const gens = Array.from(new Set(generations.values())).sort((a, b) => a - b);
  const minGen = gens[0] ?? 0;
  const yOf = (gen: number) => (gen - minGen) * GEN_GAP;

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const gen = generations.get(n.id) ?? 0;
    return { ...n, position: { x: pos.x - NODE_W / 2, y: yOf(gen) } };
  });
}

const nodeTypes = { person: PersonNode, important: ImportantNode };

/**
 * Compute generation for every person by walking up via parentCoupleId.
 * The root person is generation 0 (or whatever rootPersonId is).
 */
function computeGenerations(people: Record<string, Person>, couples: Record<string, { partnerAId: string; partnerBId: string; childrenIds: string[]; isDeleted?: boolean }>, rootId?: string) {
  const gens = new Map<string, number>();
  const ids = Object.keys(people);
  if (!ids.length) return gens;

  // BFS from root downward and upward
  const root = rootId && people[rootId] ? rootId : ids[0];
  gens.set(root, 0);

  // map: child -> parentCoupleId, couple -> children
  const queue: string[] = [root];
  const visited = new Set<string>([root]);
  while (queue.length) {
    const id = queue.shift()!;
    const gen = gens.get(id)!;
    const p = people[id];
    if (!p) continue;

    // walk up: assign parents (gen - 1)
    if (p.parentCoupleId && couples[p.parentCoupleId]) {
      const c = couples[p.parentCoupleId];
      for (const partnerId of [c.partnerAId, c.partnerBId]) {
        if (!visited.has(partnerId) && people[partnerId]) {
          gens.set(partnerId, gen - 1);
          visited.add(partnerId);
          queue.push(partnerId);
        }
      }
    }
    // spouses (same gen) and children (gen + 1)
    for (const cid of Object.keys(couples)) {
      const c = couples[cid];
      if (c.isDeleted) continue;
      if (c.partnerAId === id || c.partnerBId === id) {
        const other = c.partnerAId === id ? c.partnerBId : c.partnerAId;
        if (!visited.has(other) && people[other]) {
          gens.set(other, gen);
          visited.add(other);
          queue.push(other);
        }
        for (const childId of c.childrenIds) {
          if (!visited.has(childId) && people[childId]) {
            gens.set(childId, gen + 1);
            visited.add(childId);
            queue.push(childId);
          }
        }
      }
    }
  }
  // anything left isolated -> gen 0
  for (const id of ids) if (!gens.has(id)) gens.set(id, 0);
  return gens;
}

type AddMode =
  | { kind: 'parents'; personId: string }
  | { kind: 'spouse'; personId: string }
  | { kind: 'child'; coupleId: string }
  | null;

export function GraphView({ onEditPerson }: { onEditPerson: (id: string) => void }) {
  const people = useStore((s) => s.people);
  const couples = useStore((s) => s.couples);
  const importantPeople = useStore((s) => s.importantPeople);
  const showImp = useStore((s) => s.showImportantPeople);
  const rootId = useStore((s) => s.rootPersonId);
  const [hovered, setHovered] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);

  const nodeXOverrides = useStore((s) => s.nodeXOverrides);
  const setNodeX = useStore((s) => s.setNodeX);
  const resetPositions = useStore((s) => s.resetNodePositions);

  const generations = useMemo(() => computeGenerations(people, couples, rootId), [people, couples, rootId]);

  const minGen = useMemo(() => {
    let m = 0;
    for (const v of generations.values()) if (v < m) m = v;
    return m;
  }, [generations]);
  const yForGen = useCallback((gen: number) => (gen - minGen) * GEN_GAP, [minGen]);

  const personSpouseCoupleMap = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.values(couples).filter((c) => !c.isDeleted).forEach((c) => {
      if (!map.has(c.partnerAId)) map.set(c.partnerAId, []);
      if (!map.has(c.partnerBId)) map.set(c.partnerBId, []);
      map.get(c.partnerAId)!.push(c.id);
      map.get(c.partnerBId)!.push(c.id);
    });
    return map;
  }, [couples]);

  const onAddParents = (personId: string) => setAddMode({ kind: 'parents', personId });
  const onAddSpouse = (personId: string) => setAddMode({ kind: 'spouse', personId });
  const onAddChild = (personId: string) => {
    const coupleIds = personSpouseCoupleMap.get(personId) ?? [];
    if (coupleIds.length === 0) return;
    if (coupleIds.length === 1) {
      setAddMode({ kind: 'child', coupleId: coupleIds[0] });
    } else {
      // multiple spouses: pick first for now (could prompt later)
      setAddMode({ kind: 'child', coupleId: coupleIds[0] });
    }
  };

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    Object.values(people).filter((p) => !p.isDeleted).forEach((p) => {
      const hasSpouse = (personSpouseCoupleMap.get(p.id) ?? []).length > 0;
      ns.push({
        id: p.id,
        type: 'person',
        position: { x: 0, y: 0 },
        data: {
          personId: p.id,
          highlighted: hovered === p.id,
          dimmed: hovered != null && hovered !== p.id,
          hasSpouse,
          onEdit: onEditPerson,
          onAddParents,
          onAddSpouse,
          onAddChild,
        },
      });
    });

    // marriage edges (same generation)
    Object.values(couples).filter((c) => !c.isDeleted).forEach((c) => {
      if (people[c.partnerAId] && people[c.partnerBId]) {
        es.push({
          id: `m_${c.id}`,
          source: c.partnerAId, target: c.partnerBId,
          type: 'straight',
          style: { stroke: 'var(--color-accent-2)', strokeDasharray: '4 4', strokeWidth: 1.2 },
          className: hovered && (hovered === c.partnerAId || hovered === c.partnerBId) ? 'highlight' : '',
        });
      }
      // parent-child edges from couple to children
      c.childrenIds.forEach((childId) => {
        if (!people[childId]) return;
        es.push({
          id: `pc_${c.id}_${childId}`,
          source: c.partnerAId,
          target: childId,
          type: 'smoothstep',
          className: hovered && (hovered === c.partnerAId || hovered === c.partnerBId || hovered === childId) ? 'highlight' : '',
        });
      });
    });

    if (showImp) {
      Object.values(importantPeople).filter((ip) => !ip.isDeleted).forEach((ip) => {
        ns.push({
          id: ip.id,
          type: 'important',
          position: { x: 0, y: 0 },
          data: { importantId: ip.id, onEdit: () => {} },
        });
        ip.linkedTo.forEach((l) => {
          if (l.type === 'person' && people[l.id]) {
            es.push({
              id: `ip_${ip.id}_${l.id}`,
              source: ip.id, target: l.id,
              type: 'straight',
              style: { stroke: 'var(--color-accent)', strokeDasharray: '2 4', strokeWidth: 1 },
            });
            generations.set(ip.id, (generations.get(l.id) ?? 0));
          }
        });
      });
    }

    const laidOut = layout(ns, es, generations);
    // apply user X overrides on top of dagre layout
    const withOverrides = laidOut.map((n) => {
      const overrideX = nodeXOverrides[n.id];
      const gen = generations.get(n.id) ?? 0;
      return {
        ...n,
        position: {
          x: overrideX != null ? overrideX : n.position.x,
          y: yForGen(gen),
        },
      };
    });
    return { nodes: withOverrides, edges: es };
  }, [people, couples, importantPeople, showImp, hovered, generations, onEditPerson, personSpouseCoupleMap, nodeXOverrides, yForGen]);

  // controlled node state (so we can constrain Y on drag)
  const [liveNodes, setLiveNodes] = useState<Node[]>(nodes);
  useEffect(() => { setLiveNodes(nodes); }, [nodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLiveNodes((curr) => {
      const next = applyNodeChanges(changes, curr);
      // re-snap Y to generation level for any moved nodes
      return next.map((n) => {
        const gen = generations.get(n.id);
        if (gen != null) {
          return { ...n, position: { x: n.position.x, y: yForGen(gen) } };
        }
        return n;
      });
    });
    // persist X position when drag ends
    for (const ch of changes) {
      if (ch.type === 'position' && ch.dragging === false && ch.position) {
        setNodeX(ch.id, ch.position.x);
      }
    }
  }, [generations, yForGen, setNodeX]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, n: Node) => setHovered(n.id), []);
  const onNodeMouseLeave = useCallback(() => setHovered(null), []);

  return (
    <div className="h-full w-full" style={{ background: 'var(--color-bg)' }}>
      <button
        className="absolute right-4 top-4 z-10 rounded-lg border px-3 py-1.5 text-xs backdrop-blur"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(28,28,36,0.6)' }}
        onClick={resetPositions}
        title="Сбросить расположение узлов в авто-лейаут"
      >↺ Авто-лейаут</button>
      <ReactFlow
        nodes={liveNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        nodesDraggable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a2a36" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable style={{ background: 'var(--color-bg-2)' }} maskColor="rgba(0,0,0,0.5)" />
      </ReactFlow>
      <AddRelativeModal mode={addMode} onClose={() => setAddMode(null)} />
    </div>
  );
}
