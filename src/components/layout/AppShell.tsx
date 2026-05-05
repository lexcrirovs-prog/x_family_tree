import { ChangeEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { Download, Eye, EyeOff, Moon, RotateCcw, Sun, Upload } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import type { FamilySnapshot } from '../../types/family';
import { downloadJson, readJsonFile } from '../../utils/download';
import { ModeSwitcher } from '../Tree/ModeSwitcher';
import { GlobalSearch } from '../Search/GlobalSearch';
import { PdfExportButton } from '../PDFExport/FamilyPdf';
import { NavigationHistory } from './NavigationHistory';
import { useKeyboardMode } from '../../hooks/useKeyboardMode';

export function AppShell() {
  const mode = useFamilyStore((state) => state.mode);
  const setMode = useFamilyStore((state) => state.setMode);
  const theme = useFamilyStore((state) => state.theme);
  const toggleTheme = useFamilyStore((state) => state.toggleTheme);
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const toggleImportantPeople = useFamilyStore((state) => state.toggleImportantPeople);
  const resetSeed = useFamilyStore((state) => state.resetSeed);
  const importSnapshot = useFamilyStore((state) => state.importSnapshot);
  const snapshot = useFamilyStore((state) => state.snapshot());

  useKeyboardMode(setMode);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = await readJsonFile<FamilySnapshot>(file);
    importSnapshot(payload);
    event.currentTarget.value = '';
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <NavigationHistory />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">XT</span>
          <div>
            <strong>Генеалогическое древо</strong>
            <span>локальный семейный архив</span>
          </div>
        </div>
        <GlobalSearch />
        <ModeSwitcher value={mode} onChange={setMode} />
        <div className="toolbar-actions">
          <button type="button" className="toolbar-button" onClick={toggleImportantPeople}>
            {showImportantPeople ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>Важные</span>
          </button>
          <button type="button" className="toolbar-button" onClick={toggleTheme} title="Тема">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button type="button" className="toolbar-button" onClick={() => downloadJson('family-tree-backup.json', snapshot)}>
            <Download size={16} />
            <span>JSON</span>
          </button>
          <label className="toolbar-button import-button">
            <Upload size={16} />
            <span>Импорт</span>
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
          <PdfExportButton snapshot={snapshot} />
          <button type="button" className="toolbar-button" onClick={resetSeed} title="Вернуть демо-данные">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

