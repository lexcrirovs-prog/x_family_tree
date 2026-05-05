import { useMemo } from 'react';
import * as d3 from 'd3';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import type { Person } from '../../types/family';
import { getInitials, getYears } from '../../utils/family';

type FanSlot = {
  person?: Person;
  depth: number;
  index: number;
  count: number;
  branch: 'paternal' | 'maternal' | 'self' | 'spouse';
};

function buildAncestorSlots(people: Record<string, Person>, couples: ReturnType<typeof useFamilyStore.getState>['couples'], rootId: string) {
  const slots: FanSlot[] = [];
  const root = people[rootId];
  if (!root) return slots;
  slots.push({ person: root, depth: 0, index: 0, count: 1, branch: 'self' });

  function visit(personId: string, depth: number, index: number) {
    if (depth > 4) return;
    const person = people[personId];
    const parentCouple = person?.parentCoupleId ? couples[person.parentCoupleId] : undefined;
    const count = 2 ** depth;
    const father = parentCouple ? people[parentCouple.partnerAId] : undefined;
    const mother = parentCouple ? people[parentCouple.partnerBId] : undefined;
    const paternalIndex = index * 2;
    const maternalIndex = index * 2 + 1;

    slots.push({
      person: father,
      depth,
      index: paternalIndex,
      count,
      branch: depth === 1 ? 'paternal' : father?.branch ?? 'paternal',
    });
    slots.push({
      person: mother,
      depth,
      index: maternalIndex,
      count,
      branch: depth === 1 ? 'maternal' : mother?.branch ?? 'maternal',
    });

    if (father) visit(father.id, depth + 1, paternalIndex);
    if (mother) visit(mother.id, depth + 1, maternalIndex);
  }

  visit(root.id, 1, 0);
  return slots;
}

export function FanView() {
  const people = useFamilyStore((state) => state.people);
  const couples = useFamilyStore((state) => state.couples);
  const selectedPersonId = useFamilyStore((state) => state.selectedPersonId);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const navigate = useNavigate();

  const slots = useMemo(() => buildAncestorSlots(people, couples, selectedPersonId), [couples, people, selectedPersonId]);
  const root = people[selectedPersonId] ?? people.me;
  const arc = d3.arc<d3.DefaultArcObject>();

  const sectorPath = (slot: FanSlot) => {
    const startAngle = -Math.PI / 2 + (slot.index / slot.count) * Math.PI;
    const endAngle = -Math.PI / 2 + ((slot.index + 1) / slot.count) * Math.PI;
    const innerRadius = 70 + (slot.depth - 1) * 88;
    const outerRadius = innerRadius + 78;
    return (
      arc({
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        padAngle: 0.012,
      }) ?? ''
    );
  };

  const textPosition = (slot: FanSlot) => {
    const angle = -Math.PI / 2 + ((slot.index + 0.5) / slot.count) * Math.PI - Math.PI / 2;
    const radius = 108 + (slot.depth - 1) * 88;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius + 92,
    };
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="fan"
        className="tree-surface fan-surface"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <div className="fan-layout">
          <svg viewBox="-420 -80 840 600" role="img" aria-label="Веер предков">
            <defs>
              <filter id="soft-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="fan-root" onClick={() => navigate(`/person/${root.id}`)}>
              <circle r="58" cx="0" cy="92" />
              <text x="0" y="88" textAnchor="middle" className="fan-root-initials">
                {getInitials(root)}
              </text>
              <text x="0" y="112" textAnchor="middle">
                {root.firstName}
              </text>
            </g>
            {slots
              .filter((slot) => slot.depth > 0)
              .map((slot) => {
                const position = textPosition(slot);
                return (
                  <g
                    key={`${slot.depth}-${slot.index}-${slot.person?.id ?? 'empty'}`}
                    className={`fan-sector fan-${slot.branch}`}
                    onClick={() => {
                      if (slot.person) selectPerson(slot.person.id);
                    }}
                    onDoubleClick={() => {
                      if (slot.person) navigate(`/person/${slot.person.id}`);
                    }}
                  >
                    <path d={sectorPath(slot)} transform="translate(0,92)" />
                    {slot.person ? (
                      <>
                        <text x={position.x} y={position.y - 7} textAnchor="middle" className="fan-name">
                          {slot.person.firstName}
                        </text>
                        <text x={position.x} y={position.y + 12} textAnchor="middle" className="fan-years">
                          {getYears(slot.person)}
                        </text>
                      </>
                    ) : (
                      <text x={position.x} y={position.y} textAnchor="middle" className="fan-empty">
                        Добавить
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
          <aside className="fan-notes">
            <strong>Веер</strong>
            <span>Центр - выбранный профиль. Полукольца показывают предков до четырёх поколений.</span>
            <p>Двойной клик по сектору открывает глубокий профиль, одиночный клик выбирает человека для редактора.</p>
          </aside>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

