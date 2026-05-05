import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-1 text-sm opacity-80">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {c.to ? (
            <Link to={c.to} className="hover:underline" style={{ color: 'var(--color-accent)' }}>{c.label}</Link>
          ) : (
            <span>{c.label}</span>
          )}
          {i < crumbs.length - 1 && <span className="opacity-50">›</span>}
        </span>
      ))}
    </nav>
  );
}
