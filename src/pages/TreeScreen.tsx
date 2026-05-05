import { useState } from 'react';
import { useStore } from '../store/store';
import { GraphView } from '../components/Tree/GraphView';
import { TimelineView } from '../components/Tree/TimelineView';
import { FanView } from '../components/Tree/FanView';
import { ModeSwitcher } from '../components/Tree/ModeSwitcher';
import { TopBar } from '../components/TopBar';
import { PersonEditor } from '../components/PersonEditor';
import { motion, AnimatePresence } from 'framer-motion';

export function TreeScreen() {
  const viewMode = useStore((s) => s.viewMode);
  const [editingPersonId, setEditingPersonId] = useState<string | undefined>();

  return (
    <div className="relative flex h-full w-full flex-col">
      <TopBar />
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {viewMode === 'graph' && <GraphView onEditPerson={setEditingPersonId} />}
            {viewMode === 'timeline' && <TimelineView onEditPerson={setEditingPersonId} />}
            {viewMode === 'fan' && <FanView onEditPerson={setEditingPersonId} />}
          </motion.div>
        </AnimatePresence>
        <ModeSwitcher />
      </div>
      <PersonEditor personId={editingPersonId} onClose={() => setEditingPersonId(undefined)} />
    </div>
  );
}
