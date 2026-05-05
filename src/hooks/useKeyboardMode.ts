import { useEffect } from 'react';
import type { ViewMode } from '../types/family';

export function useKeyboardMode(onChange: (mode: ViewMode) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === '1') onChange('graph');
      if (event.key === '2') onChange('timeline');
      if (event.key === '3') onChange('fan');
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onChange]);
}

