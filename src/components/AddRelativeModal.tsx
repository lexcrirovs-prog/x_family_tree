import { useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../store/store';
import type { Gender } from '../types';

type Mode =
  | { kind: 'parents'; personId: string }
  | { kind: 'spouse'; personId: string }
  | { kind: 'child'; coupleId: string };

export function AddRelativeModal({ mode, onClose }: { mode: Mode | null; onClose: () => void }) {
  const addPerson = useStore((s) => s.addPerson);
  const addCouple = useStore((s) => s.addCouple);
  const setParents = useStore((s) => s.setParentsForPerson);
  const attachChild = useStore((s) => s.attachChild);
  const updatePerson = useStore((s) => s.updatePerson);
  const snapshot = useStore((s) => s.snapshot);
  const people = useStore((s) => s.people);

  const personA = mode && mode.kind !== 'child' ? people[mode.personId] : undefined;

  const [first1, setFirst1] = useState('');
  const [last1, setLast1] = useState('');
  const [year1, setYear1] = useState('');
  const [first2, setFirst2] = useState('');
  const [last2, setLast2] = useState('');
  const [year2, setYear2] = useState('');
  const [gender1, setGender1] = useState<Gender>('male');
  const [gender2, setGender2] = useState<Gender>('female');
  const [marriageYear, setMarriageYear] = useState('');
  const [childGender, setChildGender] = useState<Gender>('male');

  if (!mode) return null;

  const reset = () => {
    setFirst1(''); setLast1(''); setYear1('');
    setFirst2(''); setLast2(''); setYear2('');
    setGender1('male'); setGender2('female');
    setMarriageYear(''); setChildGender('male');
  };

  const submit = () => {
    snapshot(`add-${mode.kind}`);
    if (mode.kind === 'parents') {
      if (!first1 && !first2) return;
      const me = people[mode.personId];
      const myGen = me?.generation ?? 0;
      const fatherId = first1
        ? addPerson({
            firstName: first1, lastName: last1 || me?.lastName, gender: gender1,
            birthYear: year1 ? Number(year1) : undefined,
            generation: myGen - 1,
          })
        : null;
      const motherId = first2
        ? addPerson({
            firstName: first2, lastName: last2, gender: gender2,
            birthYear: year2 ? Number(year2) : undefined,
            generation: myGen - 1,
          })
        : null;
      if (fatherId && motherId) {
        const cId = addCouple(fatherId, motherId, marriageYear ? Number(marriageYear) : undefined);
        setParents(mode.personId, cId);
      }
    }
    if (mode.kind === 'spouse') {
      if (!first1) return;
      const me = people[mode.personId];
      const myGen = me?.generation ?? 0;
      const spouseGender: Gender = me?.gender === 'male' ? 'female' : 'male';
      const spId = addPerson({
        firstName: first1, lastName: last1, gender: spouseGender,
        birthYear: year1 ? Number(year1) : undefined,
        generation: myGen,
      });
      addCouple(mode.personId, spId, marriageYear ? Number(marriageYear) : undefined);
    }
    if (mode.kind === 'child') {
      if (!first1) return;
      const couple = useStore.getState().couples[mode.coupleId];
      const partnerA = couple ? useStore.getState().people[couple.partnerAId] : undefined;
      const parentGen = partnerA?.generation ?? 0;
      const childId = addPerson({
        firstName: first1, lastName: last1 || partnerA?.lastName, gender: childGender,
        birthYear: year1 ? Number(year1) : undefined,
        generation: parentGen + 1,
      });
      attachChild(mode.coupleId, childId);
      void updatePerson;
    }
    reset();
    onClose();
  };

  const title =
    mode.kind === 'parents' ? `Родители для ${personA?.firstName ?? ''}` :
    mode.kind === 'spouse' ? `Супруг(а) для ${personA?.firstName ?? ''}` :
    'Новый ребёнок';

  return (
    <Modal open={!!mode} onClose={onClose} title={title}>
      {mode.kind === 'parents' && (
        <>
          <div className="mb-2 text-sm font-medium opacity-80">Отец</div>
          <PersonFields {...{ first: first1, setFirst: setFirst1, last: last1, setLast: setLast1, year: year1, setYear: setYear1, gender: gender1, setGender: setGender1, defaultGender: 'male' }} />
          <div className="mt-4 mb-2 text-sm font-medium opacity-80">Мать</div>
          <PersonFields {...{ first: first2, setFirst: setFirst2, last: last2, setLast: setLast2, year: year2, setYear: setYear2, gender: gender2, setGender: setGender2, defaultGender: 'female' }} />
          <label className="mt-4 block text-sm">
            <span className="opacity-70">Год свадьбы (необязательно)</span>
            <input className="w-full" type="number" value={marriageYear} onChange={(e) => setMarriageYear(e.target.value)} />
          </label>
        </>
      )}
      {mode.kind === 'spouse' && (
        <>
          <PersonFields {...{ first: first1, setFirst: setFirst1, last: last1, setLast: setLast1, year: year1, setYear: setYear1, gender: gender1, setGender: setGender1, defaultGender: personA?.gender === 'male' ? 'female' : 'male' }} />
          <label className="mt-4 block text-sm">
            <span className="opacity-70">Год свадьбы</span>
            <input className="w-full" type="number" value={marriageYear} onChange={(e) => setMarriageYear(e.target.value)} />
          </label>
        </>
      )}
      {mode.kind === 'child' && (
        <PersonFields {...{ first: first1, setFirst: setFirst1, last: last1, setLast: setLast1, year: year1, setYear: setYear1, gender: childGender, setGender: setChildGender, defaultGender: 'male' }} />
      )}

      <div className="mt-5 text-right">
        <button
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-accent)' }}
          onClick={submit}
        >Создать</button>
      </div>
    </Modal>
  );
}

function PersonFields({
  first, setFirst, last, setLast, year, setYear, gender, setGender, defaultGender,
}: {
  first: string; setFirst: (v: string) => void;
  last: string; setLast: (v: string) => void;
  year: string; setYear: (v: string) => void;
  gender: Gender; setGender: (v: Gender) => void;
  defaultGender: Gender;
}) {
  void defaultGender;
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">
        <span className="opacity-70">Имя</span>
        <input className="w-full" value={first} onChange={(e) => setFirst(e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="opacity-70">Фамилия</span>
        <input className="w-full" value={last} onChange={(e) => setLast(e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="opacity-70">Год рождения</span>
        <input className="w-full" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="opacity-70">Пол</span>
        <select className="w-full" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="male">мужской</option>
          <option value="female">женский</option>
        </select>
      </label>
    </div>
  );
}
