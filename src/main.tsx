import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'reactflow/dist/style.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installUndoStack, undo } from './store/undoStack';
import { useFamilyStore } from './store/familyStore';
import { getFullName } from './utils/family';

installUndoStack();

function isTextEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const t = (el as HTMLInputElement).type;
    return ['text', 'search', 'url', 'email', 'tel', 'number', 'date', 'password'].includes(t);
  }
  return false;
}

window.addEventListener('keydown', (event) => {
  // Undo
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    if (isTextEditable(event.target)) return;
    event.preventDefault();
    undo();
    return;
  }
  // Delete selected person (Del key, not Backspace to avoid surprises)
  if (event.key === 'Delete') {
    if (isTextEditable(event.target)) return;
    const state = useFamilyStore.getState();
    const importantId = state.selectedImportantPersonId;
    if (importantId) {
      const item = state.importantPeople[importantId];
      if (!item || item.isDeleted) return;
      if (confirm(`Удалить ${getFullName(item)} (важный человек)? Восстановить можно из корзины.`)) {
        state.softDeleteImportantPerson(importantId);
      }
      event.preventDefault();
      return;
    }
    const personId = state.selectedPersonId;
    const person = personId ? state.people[personId] : undefined;
    if (!person || person.isDeleted) return;
    if (confirm(`Удалить ${getFullName(person)}? Восстановить можно из корзины слева внизу.`)) {
      state.softDeletePerson(personId);
    }
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
