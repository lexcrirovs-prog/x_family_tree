export type Milestone =
  | { kind: 'point'; year: number; label: string; color?: string }
  | { kind: 'range'; from: number; to: number; label: string; color?: string };

export const HISTORICAL_MILESTONES: Milestone[] = [
  { kind: 'range', from: 1853, to: 1856, label: 'Крымская война', color: '#8a5a44' },
  { kind: 'point', year: 1861, label: 'Отмена крепостного права', color: '#999' },
  { kind: 'range', from: 1904, to: 1905, label: 'Русско-японская война', color: '#8a5a44' },
  { kind: 'range', from: 1914, to: 1918, label: 'Первая мировая война', color: '#a14545' },
  { kind: 'point', year: 1917, label: 'Революция', color: '#c44' },
  { kind: 'range', from: 1918, to: 1922, label: 'Гражданская война', color: '#a14545' },
  { kind: 'point', year: 1922, label: 'Образование СССР', color: '#999' },
  { kind: 'range', from: 1932, to: 1933, label: 'Голод', color: '#666' },
  { kind: 'range', from: 1937, to: 1938, label: 'Большой террор', color: '#666' },
  { kind: 'range', from: 1941, to: 1945, label: 'Великая Отечественная война', color: '#c44' },
  { kind: 'point', year: 1953, label: 'Смерть Сталина', color: '#888' },
  { kind: 'point', year: 1957, label: 'Запуск спутника', color: '#7a9' },
  { kind: 'point', year: 1961, label: 'Полёт Гагарина', color: '#7a9' },
  { kind: 'range', from: 1979, to: 1989, label: 'Афганская война', color: '#a14545' },
  { kind: 'point', year: 1986, label: 'Чернобыль', color: '#c84' },
  { kind: 'point', year: 1991, label: 'Распад СССР', color: '#c44' },
  { kind: 'point', year: 1998, label: 'Дефолт', color: '#888' },
  { kind: 'point', year: 2008, label: 'Финансовый кризис', color: '#888' },
  { kind: 'point', year: 2014, label: 'Присоединение Крыма', color: '#888' },
  { kind: 'range', from: 2020, to: 2022, label: 'Пандемия COVID-19', color: '#7a9' },
  { kind: 'point', year: 2022, label: 'СВО', color: '#a14545' },
];
