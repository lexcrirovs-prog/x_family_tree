import { ChangeEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { Download, Eye, EyeOff, GitBranch, Move, Moon, RotateCcw, Sun, Type, Undo2, Upload } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import type { FamilySnapshot } from '../../types/family';
import { downloadJson, readJsonFile } from '../../utils/download';
import { ModeSwitcher } from '../Tree/ModeSwitcher';
import { GlobalSearch } from '../Search/GlobalSearch';
import { PdfExportButton } from '../PDFExport/FamilyPdf';
import { NavigationHistory } from './NavigationHistory';
import { useKeyboardMode } from '../../hooks/useKeyboardMode';
import { BirthdayWidget } from '../Widgets/BirthdayWidget';
import { SurnameFilter } from './SurnameFilter';
import { TrashDrawer } from './TrashDrawer';
import { undo } from '../../store/undoStack';

const SCALE_LABEL: Record<string, string> = {
  normal: 'А',
  large: 'А+',
  huge: 'А++',
};

const SCALE_DESCRIPTION: Record<string, string> = {
  normal: 'Обычный шрифт. Клик — крупный.',
  large: 'Крупный шрифт. Клик — огромный.',
  huge: 'Огромный шрифт. Клик — вернуться к обычному.',
};

export function AppShell() {
  const mode = useFamilyStore((state) => state.mode);
  const setMode = useFamilyStore((state) => state.setMode);
  const theme = useFamilyStore((state) => state.theme);
  const toggleTheme = useFamilyStore((state) => state.toggleTheme);
  const uiScale = useFamilyStore((state) => state.uiScale);
  const cycleUiScale = useFamilyStore((state) => state.cycleUiScale);
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const toggleImportantPeople = useFamilyStore((state) => state.toggleImportantPeople);
  const resetSeed = useFamilyStore((state) => state.resetSeed);
  const resetAllPositions = useFamilyStore((state) => state.resetAllPositions);
  const importSnapshot = useFamilyStore((state) => state.importSnapshot);
  const kinshipMode = useFamilyStore((state) => state.kinshipMode);
  const toggleKinshipMode = useFamilyStore((state) => state.toggleKinshipMode);
  const people = useFamilyStore((state) => state.people);
  const couples = useFamilyStore((state) => state.couples);
  const importantPeople = useFamilyStore((state) => state.importantPeople);
  const events = useFamilyStore((state) => state.events);
  const media = useFamilyStore((state) => state.media);
  const snapshot: FamilySnapshot = { people, couples, importantPeople, events, media };

  useKeyboardMode(setMode);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = await readJsonFile<FamilySnapshot>(file);
    importSnapshot(payload);
    event.currentTarget.value = '';
  };

  return (
    <div className={`app-shell theme-${theme} scale-${uiScale}`}>
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
          <SurnameFilter />
          <BirthdayWidget />
          <button
            type="button"
            className={`toolbar-button${kinshipMode ? ' toolbar-button-active' : ''}`}
            onClick={toggleKinshipMode}
            title="Режим «Кто кому кем»: клик по узлу делает его якорем, под остальными появятся подписи родства"
            aria-label="Режим родства"
            aria-pressed={kinshipMode}
          >
            <GitBranch size={16} />
            <span>Родство</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              if (!undo()) return;
            }}
            title="Отменить последнее изменение (Ctrl+Z)"
            aria-label="Отменить"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              if (confirm('Сбросить раскладку узлов к автоматической?')) resetAllPositions();
            }}
            title="Вернуть автоматическую раскладку графа"
            aria-label="Сбросить раскладку"
          >
            <Move size={16} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={toggleImportantPeople}
            title={showImportantPeople ? 'Скрыть «важных» людей' : 'Показать «важных» людей'}
          >
            {showImportantPeople ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>Важные</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            type="button"
            className="toolbar-button scale-toggle"
            onClick={cycleUiScale}
            title={SCALE_DESCRIPTION[uiScale]}
          >
            <Type size={16} />
            <span>{SCALE_LABEL[uiScale]}</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => downloadJson('family-tree-backup.json', snapshot)}
            title="Скачать резервную копию всего дерева в JSON"
          >
            <Download size={16} />
            <span>JSON</span>
          </button>
          <label
            className="toolbar-button import-button"
            title="Импортировать дерево из ранее скачанного JSON"
          >
            <Upload size={16} />
            <span>Импорт</span>
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
          <PdfExportButton snapshot={snapshot} />
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              if (confirm('Вернуть все данные к демо-семье? Текущие изменения будут потеряны.')) {
                resetSeed();
              }
            }}
            title="Откатить к демо-данным (для теста)"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>
      <Outlet />
      <TrashDrawer />
    </div>
  );
}
