import { useStore } from './store';

/** Initialize with a default "me" + a brother + parents + grandparents skeleton */
export function seedInitial() {
  const s = useStore.getState();
  if (Object.keys(s.people).length > 0) return;

  const meId = s.addPerson({ firstName: 'Я', lastName: '', gender: 'male', generation: 0 });
  const broId = s.addPerson({ firstName: 'Брат', lastName: '', gender: 'male', generation: 0 });
  const momId = s.addPerson({ firstName: 'Мама', lastName: '', gender: 'female', generation: -1 });
  const dadId = s.addPerson({ firstName: 'Папа', lastName: '', gender: 'male', generation: -1 });

  const parentsCoupleId = s.addCouple(dadId, momId);
  s.attachChild(parentsCoupleId, meId);
  s.attachChild(parentsCoupleId, broId);

  // grandparents (paternal)
  const gpaPId = s.addPerson({ firstName: 'Дед (отец отца)', gender: 'male', generation: -2 });
  const gmaPId = s.addPerson({ firstName: 'Бабушка (мать отца)', gender: 'female', generation: -2 });
  const gpaP = s.addCouple(gpaPId, gmaPId);
  s.attachChild(gpaP, dadId);

  // grandparents (maternal)
  const gpaMId = s.addPerson({ firstName: 'Дед (отец матери)', gender: 'male', generation: -2 });
  const gmaMId = s.addPerson({ firstName: 'Бабушка (мать матери)', gender: 'female', generation: -2 });
  const gpaM = s.addCouple(gpaMId, gmaMId);
  s.attachChild(gpaM, momId);

  useStore.setState({ rootPersonId: meId });
}
