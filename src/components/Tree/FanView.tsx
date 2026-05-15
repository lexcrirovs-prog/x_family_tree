import { useMemo } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import type { Person } from '../../types/family';
import { getFullName, getInitials, getYears, personMatchesSurname } from '../../utils/family';

type FanSlot = {
  person?: Person;
  depth: number;
  index: number;
  count: number;
  branch: 'paternal' | 'maternal' | 'self' | 'spouse';
};

function buildAncestorSlots(
  people: Record<string, Person>,
  couples: ReturnType<typeof useFamilyStore.getState>['couples'],
  rootId: string,
) {
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
  const fanRootId = useFamilyStore((state) => state.fanRootId);
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setFanRoot = useFamilyStore((state) => state.setFanRoot);
  const surnameFilter = useFamilyStore((state) => state.surnameFilter);
  const surnameFilterMode = useFamilyStore((state) => state.surnameFilterMode);
  const surnameActive = Boolean(surnameFilter) && surnameFilterMode !== 'off';
  const navigate = useNavigate();

  const effectiveRootId = people[fanRootId] ? fanRootId : 'me';
  const slots = useMemo(
    () => buildAncestorSlots(people, couples, effectiveRootId),
    [couples, people, effectiveRootId],
  );
  const root = people[effectiveRootId] ?? people.me;
  const selectedPerson = people[selectedPersonId];
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

  const canPromote = selectedPerson && selectedPerson.id !== effectiveRootId;

  return (
    <div className="tree-surface fan-surface">
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
          <g
            className={
              selectedPersonId === root.id ? 'fan-root fan-root-selected' : 'fan-root'
            }
            onClick={() => selectPerson(root.id)}
            onDoubleClick={() => navigate(`/person/${root.id}`)}
          >
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
              const isSelected = slot.person?.id && slot.person.id === selectedPersonId;
              const surnameMatches =
                slot.person && surnameFilter
                  ? personMatchesSurname(slot.person, surnameFilter)
                  : true;
              const filterMuted = surnameActive && !surnameMatches;
              return (
                <g
                  key={`${slot.depth}-${slot.index}-${slot.person?.id ?? 'empty'}`}
                  className={`fan-sector fan-${slot.branch}${isSelected ? ' fan-sector-selected' : ''}${filterMuted ? ' fan-sector-muted' : ''}`}
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
                      <text
                        x={position.x}
                        y={position.y - 7}
                        textAnchor="middle"
                        className="fan-name"
                      >
                        {slot.person.firstName}
                      </text>
                      <text
                        x={position.x}
                        y={position.y + 12}
                        textAnchor="middle"
                        className="fan-years"
                      >
                        {getYears(slot.person)}
                      </text>
                    </>
                  ) : (
                    <text
                      x={position.x}
                      y={position.y}
                      textAnchor="middle"
                      className="fan-empty"
                    >
                      Добавить
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
        <aside className="fan-notes">
          <strong>Веер</strong>
          <span>
            В центре — корень веера, полукольца показывают предков до четырёх поколений.
            Одинарный клик подсвечивает человека, двойной — открывает профиль.
          </span>
          <p>
            Корень веера: <strong>{getFullName(root)}</strong>
          </p>
          <p>
            Выбран:{' '}
            <strong>{selectedPerson ? getFullName(selectedPerson) : '—'}</strong>
          </p>
          <div className="fan-actions">
            <button
              type="button"
              disabled={!canPromote}
              onClick={() => selectedPerson && setFanRoot(selectedPerson.id)}
              title="Сделать выбранного человека корнем веера"
            >
              Сделать корнем веера
            </button>
            <button
              type="button"
              disabled={effectiveRootId === 'me'}
              onClick={() => setFanRoot('me')}
              title="Вернуть стартовый корень"
            >
              Назад к стартовому
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
