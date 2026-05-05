import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

export function Modal({ open, onClose, children, title, wide }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            className={`scrollbar relative rounded-2xl border ${wide ? 'w-[min(900px,92vw)]' : 'w-[min(560px,92vw)]'} max-h-[88vh] overflow-y-auto`}
            style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3"
                 style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-medium">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm opacity-70 hover:opacity-100"
                style={{ color: 'var(--color-muted)' }}
                aria-label="Закрыть"
              >✕</button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
