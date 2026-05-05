import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/store';
import { seedInitial } from './store/seed';
import { TreeScreen } from './pages/TreeScreen';
import { PersonProfile } from './pages/PersonProfile';
import { ImportantPersonProfile } from './pages/ImportantPersonProfile';

export default function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    seedInitial();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<TreeScreen />} />
      <Route path="/person/:id" element={<PersonProfile />} />
      <Route path="/important-person/:id" element={<ImportantPersonProfile />} />
    </Routes>
  );
}
