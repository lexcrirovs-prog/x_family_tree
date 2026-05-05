import { Link } from 'react-router-dom';

type BreadcrumbsProps = {
  items: Array<{ label: string; to?: string }>;
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      <Link to="/">Дерево</Link>
      {items.map((item) => (
        <span key={`${item.label}-${item.to ?? ''}`}>
          <span>›</span>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
        </span>
      ))}
    </nav>
  );
}

