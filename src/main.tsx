import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'reactflow/dist/style.css';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installUndoStack, undo } from './store/undoStack';

installUndoStack();

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  // Allow undo inside inputs too — but only with Ctrl/Cmd+Z, not just Z.
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    // If user is in a text input and there's a native browser undo available, prefer ours
    // only when no text-input element is focused — avoids fighting native undo of typing.
    const isText =
      target &&
      ((target.tagName === 'INPUT' &&
        ['text', 'search', 'url', 'email', 'tel', 'number', 'date'].includes(
          (target as HTMLInputElement).type,
        )) ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);
    if (isText) return;
    event.preventDefault();
    undo();
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
