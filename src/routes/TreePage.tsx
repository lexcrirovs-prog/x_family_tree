import { motion } from 'framer-motion';
import { useFamilyStore } from '../store/familyStore';
import { GraphView } from '../components/Tree/GraphView';
import { TimelineView } from '../components/Tree/TimelineView';
import { FanView } from '../components/Tree/FanView';
import { PersonEditor } from '../components/PersonEditor';

export function TreePage() {
  const mode = useFamilyStore((state) => state.mode);

  return (
    <motion.main className="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="workspace-main">
        {mode === 'graph' && <GraphView />}
        {mode === 'timeline' && <TimelineView />}
        {mode === 'fan' && <FanView />}
      </section>
      <PersonEditor />
    </motion.main>
  );
}

