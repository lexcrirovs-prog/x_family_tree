import { useCallback, useEffect, useRef } from 'react';
import type { ReactFlowInstance, Viewport } from 'reactflow';

type Sample = { x: number; y: number; t: number };

/**
 * Adds a subtle inertia animation after the user releases a pan gesture.
 * Exposes `onMoveStart`, `onMove`, `onMoveEnd` that should be wired to
 * the matching ReactFlow props.
 */
export function usePanInertia(getRf: () => ReactFlowInstance | undefined) {
  const samples = useRef<Sample[]>([]);
  const rafId = useRef<number | null>(null);
  const dragging = useRef(false);

  const stopAnimation = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const onMoveStart = useCallback(() => {
    stopAnimation();
    samples.current = [];
    dragging.current = true;
  }, [stopAnimation]);

  const onMove = useCallback((_event: unknown, viewport: Viewport) => {
    if (!dragging.current) return;
    const now = performance.now();
    samples.current.push({ x: viewport.x, y: viewport.y, t: now });
    if (samples.current.length > 6) samples.current.shift();
  }, []);

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      dragging.current = false;
      const pts = samples.current;
      samples.current = [];
      if (pts.length < 2) return;
      const last = pts[pts.length - 1];
      const first = pts[0];
      const dt = last.t - first.t;
      if (dt <= 0) return;
      let vx = (last.x - first.x) / dt; // px per ms
      let vy = (last.y - first.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed < 0.05) return;
      // Cap the kick so a fast flick doesn't fly off-screen.
      const MAX = 2.5;
      if (speed > MAX) {
        const k = MAX / speed;
        vx *= k;
        vy *= k;
      }
      const rf = getRf();
      if (!rf) return;
      let lastT = performance.now();
      let x = viewport.x;
      let y = viewport.y;
      const zoom = viewport.zoom;
      const decay = 0.92;
      const step = () => {
        const now = performance.now();
        const elapsed = now - lastT;
        lastT = now;
        x += vx * elapsed;
        y += vy * elapsed;
        // Frame-rate independent decay: pow(decay, elapsed/16)
        const factor = Math.pow(decay, elapsed / 16);
        vx *= factor;
        vy *= factor;
        rf.setViewport({ x, y, zoom });
        if (Math.hypot(vx, vy) > 0.001) {
          rafId.current = requestAnimationFrame(step);
        } else {
          rafId.current = null;
        }
      };
      rafId.current = requestAnimationFrame(step);
    },
    [getRf],
  );

  useEffect(() => stopAnimation, [stopAnimation]);

  return { onMoveStart, onMove, onMoveEnd };
}
