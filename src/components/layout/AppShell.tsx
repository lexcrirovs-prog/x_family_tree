import { ChangeEvent, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Download, Eye, EyeOff, LogOut, Moon, RotateCcw, Sun, Upload, Users } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import type { FamilySnapshot } from '../../types/family';
import { downloadJson, readJsonFile } from '../../utils/download';
import { ModeSwitcher } from '../Tree/ModeSwitcher';
import { GlobalSearch } from '../Search/GlobalSearch';
import { PdfExportButton } from '../PDFExport/FamilyPdf';
import { NavigationHistory } from './NavigationHistory';
import { useKeyboardMode } from '../../hooks/useKeyboardMode';
import { supabase } from '../../lib/supabase';
import { inviteMemberByEmail } from '../../storage/SupabaseAdapter';

export function AppShell() {
  const mode = useFamilyStore((state) => state.mode);
  const setMode = useFamilyStore((state) => state.setMode);
  const theme = useFamilyStore((state) => state.theme);
  const toggleTheme = useFamilyStore((state) => state.toggleTheme);
  const showImportantPeople = useFamilyStore((state) => state.showImportantPeople);
  const toggleImportantPeople = useFamilyStore((state) => state.toggleImportantPeople);
  const resetSeed = useFamilyStore((state) => state.resetSeed);
  const importSnapshot = useFamilyStore((state) => state.importSnapshot);
  const treeId = useFamilyStore((state) => state.treeId);
  const userRole = useFamilyStore((state) => state.userRole);
  const people = useFamilyStore((state) => state.people);
  const couples = useFamilyStore((state) => state.couples);
  const importantPeople = useFamilyStore((state) => state.importantPeople);
  const events = useFamilyStore((state) => state.events);
  const media = useFamilyStore((state) => state.media);
  const snapshot: FamilySnapshot = { people, couples, importantPeople, events, media };
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteStatus, setInviteStatus] = useState<string | undefined>();

  useKeyboardMode(setMode);

  const canEdit = userRole === 'owner' || userRole === 'editor';
  const isOwner = userRole === 'owner';

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = await readJsonFile<FamilySnapshot>(file);
    importSnapshot(payload);
    event.currentTarget.value = '';
  };

  const handleInvite = async () => {
    if (!treeId || !inviteEmail) return;
    setInviteStatus(undefined);
    try {
      await inviteMemberByEmail(treeId, inviteEmail.trim(), inviteRole);
      setInviteStatus(`Добавлен ${inviteEmail} как ${inviteRole}.`);
      setInviteEmail('');
    } catch (err) {
      setInviteStatus((err as Error).message);
    }
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <NavigationHistory />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">XT</span>
          <div>
            <strong>Генеалогическое древо</strong>
            <span>{userRole ? `режим: ${userRole}` : 'семейный архив'}</span>
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
          <button
            type="button"
            className="toolbar-button"
            onClick={() => downloadJson('family-tree-backup.json', snapshot)}
          >
            <Download size={16} />
            <span>JSON</span>
          </button>
          {canEdit && (
            <label className="toolbar-button import-button">
              <Upload size={16} />
              <span>Импорт</span>
              <input type="file" accept="application/json" onChange={handleImport} />
            </label>
          )}
          <PdfExportButton snapshot={snapshot} />
          {isOwner && (
            <button
              type="button"
              className="toolbar-button"
              onClick={() => setShareOpen((v) => !v)}
              title="Поделиться деревом"
            >
              <Users size={16} />
              <span>Поделиться</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="toolbar-button"
              onClick={resetSeed}
              title="Вернуть демо-данные"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            type="button"
            className="toolbar-button"
            onClick={() => supabase.auth.signOut()}
            title="Выйти"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      {shareOpen && isOwner && (
        <div className="share-panel">
          <strong>Пригласить родственника</strong>
          <p>
            Сначала попросите человека войти на сайт по magic link (тогда у него появится
            аккаунт), затем введите его email здесь — и он сразу получит доступ.
          </p>
          <div className="share-form">
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
            >
              <option value="editor">Редактор</option>
              <option value="viewer">Только чтение</option>
            </select>
            <button type="button" onClick={handleInvite}>
              Пригласить
            </button>
          </div>
          {inviteStatus && <p className="share-status">{inviteStatus}</p>}
        </div>
      )}
      <Outlet />
    </div>
  );
}

