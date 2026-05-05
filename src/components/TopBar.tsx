import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { useState, useEffect } from 'react';
import { SearchBox } from './Search/SearchBox';
import { exportPdf } from '../components/PDFExport/exportPdf';

export function TopBar() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const showImp = useStore((s) => s.showImportantPeople);
  const toggleImp = useStore((s) => s.toggleImportantPeople);
  const treeTitle = useStore((s) => s.treeTitle);
  const setTreeTitle = useStore((s) => s.setTreeTitle);
  const [titleEditing, setTitleEditing] = useState(false);
  const exportJson = useStore((s) => s.exportJson);
  const importJson = useStore((s) => s.importJson);
  const resetAll = useStore((s) => s.resetAll);
  const undo = useStore((s) => s.undo);
  const historyIndex = useStore((s) => s.historyIndex);
  const [busy, setBusy] = useState(false);

  const onExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(importJson);
  };

  const onPdf = async () => {
    setBusy(true);
    try { await exportPdf(); } finally { setBusy(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я')) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return (
    <div className="flex items-center justify-between gap-4 border-b px-4 py-2"
         style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <Link to="/" className="text-base shrink-0">🌳</Link>
        {titleEditing ? (
          <input
            autoFocus
            className="min-w-[12ch] max-w-[28ch] text-base font-medium"
            value={treeTitle}
            onChange={(e) => setTreeTitle(e.target.value)}
            onBlur={() => setTitleEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setTitleEditing(false); }}
          />
        ) : (
          <button
            onDoubleClick={() => setTitleEditing(true)}
            onClick={() => setTitleEditing(true)}
            className="truncate text-base font-medium tracking-tight hover:opacity-80"
            title="Кликните, чтобы переименовать"
          >{treeTitle}</button>
        )}
      </div>
      <div className="flex-1 max-w-md">
        <SearchBox />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button
          className="rounded-lg border px-3 py-1.5 disabled:opacity-30 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Откатить последнее изменение (Ctrl+Z)"
        >↶ Откат</button>
        <button
          className="rounded-lg border px-3 py-1.5 opacity-80 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={toggleImp}
          title="Показать/скрыть важных людей"
        >{showImp ? '◆ Скрыть важных' : '◇ Показать важных'}</button>
        <button
          className="rounded-lg border px-3 py-1.5 opacity-80 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={onExport}
        >Экспорт JSON</button>
        <label className="rounded-lg border px-3 py-1.5 opacity-80 hover:opacity-100 cursor-pointer"
               style={{ borderColor: 'var(--color-border)' }}>
          Импорт
          <input type="file" accept="application/json" className="hidden" onChange={onImport} />
        </label>
        <button
          className="rounded-lg border px-3 py-1.5 opacity-80 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={onPdf}
          disabled={busy}
        >{busy ? '...' : 'Экспорт PDF'}</button>
        <button
          className="rounded-lg border px-3 py-1.5 opacity-80 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >{theme === 'dark' ? '☀' : '☾'}</button>
        <button
          className="rounded-lg border px-3 py-1.5 opacity-60 hover:opacity-100"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => { if (confirm('Полностью очистить дерево?')) resetAll(); }}
        >Сброс</button>
      </div>
    </div>
  );
}
