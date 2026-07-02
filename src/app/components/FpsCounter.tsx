"use client";

// ── Desarrollador: cambiar a false para deshabilitar completamente ──
const DEV_FPS_ENABLED = true;

import { useState, useEffect, useRef, useCallback } from "react";

export default function FpsCounter() {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    framesRef.current++;
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    if (delta >= 500) {
      setFps(Math.round((framesRef.current / delta) * 1000));
      framesRef.current = 0;
      lastTimeRef.current = now;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!DEV_FPS_ENABLED) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!visible) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    framesRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, tick]);

  if (!DEV_FPS_ENABLED || !visible) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[9999] font-mono text-sm text-lime-400 bg-black/70 px-2 py-1 rounded select-none pointer-events-none">
      {fps} FPS
    </div>
  );
}
