import { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useStore } from '../../store/store';

type FanNode = {
  personId?: string;
  name: string;
  generation: number;
  side: 'father' | 'mother' | 'self';
  startAngle: number;
  endAngle: number;
  isSpouse?: boolean;
};

export function FanView({ onEditPerson }: { onEditPerson: (id: string) => void }) {
  const people = useStore((s) => s.people);
  const couples = useStore((s) => s.couples);
  const rootId = useStore((s) => s.rootPersonId);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = useMemo<FanNode[]>(() => {
    const out: FanNode[] = [];
    if (!rootId || !people[rootId]) return out;

    const MAX_GEN = 5;
    out.push({ personId: rootId, name: `${people[rootId].firstName} ${people[rootId].lastName}`, generation: 0, side: 'self', startAngle: -Math.PI / 2, endAngle: Math.PI / 2 });

    // self's spouses: shown as half-ring on the opposite side
    const selfCouples = Object.values(couples).filter(
      (c) => !c.isDeleted && (c.partnerAId === rootId || c.partnerBId === rootId)
    );
    selfCouples.slice(0, 1).forEach((c) => {
      const sp = c.partnerAId === rootId ? c.partnerBId : c.partnerAId;
      const spouse = people[sp];
      if (spouse) {
        out.push({
          personId: sp, name: `${spouse.firstName} ${spouse.lastName}`,
          generation: 0, side: 'self',
          startAngle: Math.PI / 2, endAngle: 3 * Math.PI / 2,
          isSpouse: true,
        });
      }
    });

    const recurse = (personId: string, gen: number, startA: number, endA: number, side: 'father' | 'mother') => {
      if (gen > MAX_GEN) return;
      const p = people[personId];
      if (!p) return;
      const span = endA - startA;
      out.push({ personId, name: `${p.firstName} ${p.lastName}`, generation: gen, side, startAngle: startA, endAngle: endA });
      if (p.parentCoupleId) {
        const c = couples[p.parentCoupleId];
        if (c) {
          const father = people[c.partnerAId];
          const mother = people[c.partnerBId];
          if (father) recurse(father.id, gen + 1, startA, startA + span / 2, side);
          if (mother) recurse(mother.id, gen + 1, startA + span / 2, endA, side);
        }
      }
    };

    const root = people[rootId];
    if (root.parentCoupleId) {
      const c = couples[root.parentCoupleId];
      if (c) {
        if (people[c.partnerAId]) recurse(c.partnerAId, 1, -Math.PI / 2, 0, 'father');
        if (people[c.partnerBId]) recurse(c.partnerBId, 1, 0, Math.PI / 2, 'mother');
      }
    }
    return out;
  }, [people, couples, rootId]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll('*').remove();

    const w = svgEl.clientWidth ?? 800;
    const h = svgEl.clientHeight ?? 600;
    const cx = w / 2;
    const cy = h / 2;
    const ringWidth = Math.min(w, h) / 14;

    // root group that will be transformed by zoom/pan
    const root = svg.append('g').attr('class', 'fan-root');
    const g = root.append('g').attr('transform', `translate(${cx}, ${cy})`);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoom).on('dblclick.zoom', null);
    // initial transform: identity (zoom group sits on root, content is centered via inner translate)
    svg.call(zoom.transform, d3.zoomIdentity);

    nodes.forEach((n) => {
      const inner = n.generation === 0 ? 0 : ringWidth * n.generation;
      const outer = ringWidth * (n.generation + 1);
      const arc = d3.arc<FanNode>()
        .innerRadius(inner)
        .outerRadius(outer)
        .startAngle(n.startAngle)
        .endAngle(n.endAngle)
        .padAngle(0.005);

      const baseColor = n.side === 'father' ? '#7c9cff' : n.side === 'mother' ? '#ff9ec7' : '#a48cff';
      const color = d3.color(baseColor)?.darker(n.generation * 0.15)?.formatHex() ?? baseColor;

      g.append('path')
        .attr('d', arc(n) ?? '')
        .attr('fill', n.isSpouse ? d3.color(baseColor)?.brighter(0.2)?.formatHex() ?? color : color)
        .attr('opacity', n.isSpouse ? 0.55 : 0.85)
        .attr('stroke', '#1a1a22')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', n.isSpouse ? '4 3' : null)
        .style('cursor', n.personId ? 'pointer' : 'default')
        .on('click', () => { if (n.personId) onEditPerson(n.personId); });

      const midAngle = (n.startAngle + n.endAngle) / 2;
      const r = (inner + outer) / 2;
      const x = Math.cos(midAngle - Math.PI / 2) * r;
      const y = Math.sin(midAngle - Math.PI / 2) * r;
      const rotation = (midAngle * 180) / Math.PI;

      g.append('text')
        .attr('x', x).attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('transform', `rotate(${rotation}, ${x}, ${y})`)
        .attr('fill', '#fff')
        .attr('font-size', n.generation === 0 ? 14 : Math.max(8, 12 - n.generation))
        .attr('pointer-events', 'none')
        .text(n.name.length > 18 ? n.name.slice(0, 16) + '…' : n.name);
    });
  }, [nodes, onEditPerson]);

  return (
    <div className="h-full w-full" style={{ background: 'var(--color-bg)' }}>
      <svg ref={svgRef} className="h-full w-full" />
      {!nodes.length && (
        <div className="absolute inset-0 flex items-center justify-center text-sm opacity-60">
          Установите корневого человека, чтобы построить веер
        </div>
      )}
    </div>
  );
}
