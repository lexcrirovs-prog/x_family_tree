import type { Gender, LifeEventType } from '../types/family';

export type StageKey =
  | 'birth'
  | 'school'
  | 'marriage'
  | 'children'
  | 'work'
  | 'military'
  | 'retirement'
  | 'memorable';

export type LifeStage = {
  key: StageKey;
  title: string;
  description: string;
  /** Default event type when user creates one via the "+ Событие" button. */
  defaultEventType: LifeEventType;
  /** Event types that belong to this stage. The first match wins when grouping. */
  types: LifeEventType[];
  /** Show this stage only for the given gender; undefined = visible to all. */
  requiresGender?: Gender;
};

export const LIFE_STAGES: LifeStage[] = [
  {
    key: 'birth',
    title: 'Рождение',
    description: 'Дата и место рождения, родители, ранние фото.',
    defaultEventType: 'birth',
    types: ['birth'],
  },
  {
    key: 'school',
    title: 'Школа и учёба',
    description: 'Школьные годы, учёба, наставники.',
    defaultEventType: 'school',
    types: ['school', 'education'],
  },
  {
    key: 'marriage',
    title: 'Свадьба',
    description: 'Свадьба, знакомство, годовщины.',
    defaultEventType: 'marriage',
    types: ['marriage'],
  },
  {
    key: 'children',
    title: 'Рождение детей',
    description: 'Появление детей, первые годы их жизни.',
    defaultEventType: 'childBirth',
    types: ['childBirth'],
  },
  {
    key: 'work',
    title: 'Работа',
    description: 'Карьера, достижения, важные проекты. Прикрепите ссылку на сайт компании или статью в Вики.',
    defaultEventType: 'work',
    types: ['work', 'achievement'],
  },
  {
    key: 'military',
    title: 'Военная служба',
    description: 'Срок службы, часть, награды, фронтовые письма.',
    defaultEventType: 'military',
    types: ['military'],
    requiresGender: 'male',
  },
  {
    key: 'retirement',
    title: 'Пенсия',
    description: 'Выход на пенсию, новые увлечения.',
    defaultEventType: 'retirement',
    types: ['retirement'],
  },
  {
    key: 'memorable',
    title: 'Памятные события',
    description: 'Путешествия, переезды, встречи и всё остальное.',
    defaultEventType: 'memorable',
    types: ['memorable', 'travel', 'meeting', 'move', 'custom', 'death'],
  },
];

const STAGE_BY_TYPE: Map<LifeEventType, StageKey> = (() => {
  const map = new Map<LifeEventType, StageKey>();
  for (const stage of LIFE_STAGES) {
    for (const t of stage.types) {
      if (!map.has(t)) map.set(t, stage.key);
    }
  }
  return map;
})();

export function getStageOf(type: LifeEventType): StageKey {
  return STAGE_BY_TYPE.get(type) ?? 'memorable';
}

export function stageIcon(key: StageKey): string {
  switch (key) {
    case 'birth':
      return '🍼';
    case 'school':
      return '✎';
    case 'marriage':
      return '◇';
    case 'children':
      return '+';
    case 'work':
      return '▦';
    case 'military':
      return '⚔';
    case 'retirement':
      return '☕';
    case 'memorable':
      return '❖';
    default:
      return '•';
  }
}

export function stagesForGender(gender?: Gender): LifeStage[] {
  return LIFE_STAGES.filter((s) => !s.requiresGender || s.requiresGender === gender);
}
