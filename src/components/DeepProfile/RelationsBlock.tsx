import { Link } from 'react-router-dom';
import type { Person, Couple } from '../../types';

type Relations = {
  person: Person;
  parentCouple?: Couple;
  father?: Person;
  mother?: Person;
  siblings: Person[];
  spouseCouples: Couple[];
  spouses: Person[];
  children: Person[];
};

export function RelationsBlock({ relations }: { relations: Relations }) {
  const { father, mother, siblings, spouses, children } = relations;
  const Item = ({ p, role }: { p: Person; role?: string }) => (
    <Link
      to={`/person/${p.id}`}
      className="block rounded-lg border px-3 py-2 hover:opacity-80"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="text-sm font-medium">{p.firstName} {p.lastName}</div>
      <div className="text-xs opacity-60">
        {role ? `${role} · ` : ''}{p.birthYear ?? '?'} – {p.deathYear ?? 'наст.'}
      </div>
    </Link>
  );

  return (
    <section className="rounded-2xl border p-5"
             style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      <h2 className="mb-3 text-base font-medium">Связи</h2>
      <div className="space-y-3">
        {(father || mother) && (
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider opacity-60">Родители</div>
            <div className="space-y-1.5">
              {father && <Item p={father} role="отец" />}
              {mother && <Item p={mother} role="мать" />}
            </div>
          </div>
        )}
        {spouses.length > 0 && (
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider opacity-60">Супруг(и)</div>
            <div className="space-y-1.5">{spouses.map((p) => <Item key={p.id} p={p} />)}</div>
          </div>
        )}
        {children.length > 0 && (
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider opacity-60">Дети</div>
            <div className="space-y-1.5">{children.map((p) => <Item key={p.id} p={p} />)}</div>
          </div>
        )}
        {siblings.length > 0 && (
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider opacity-60">Братья / сёстры</div>
            <div className="space-y-1.5">{siblings.map((p) => <Item key={p.id} p={p} />)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
