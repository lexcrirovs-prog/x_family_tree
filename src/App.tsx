import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PersonProfile } from './components/DeepProfile/PersonProfile';
import { ImportantPersonProfile } from './components/DeepProfile/ImportantPersonProfile';
import { LifeGallery } from './components/DeepProfile/LifeGallery';
import { TreePage } from './routes/TreePage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<TreePage />} />
        <Route path="/person/:id" element={<PersonProfile />} />
        <Route path="/person/:id/gallery" element={<LifeGallery />} />
        <Route path="/important-person/:id" element={<ImportantPersonProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

