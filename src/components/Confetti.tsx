import { useEffect, useRef } from "react";

/** One-shot canvas confetti in the four palette colours. Skipped for reduced motion. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const colors = ["--pop-teal", "--pop-coral", "--pop-sun", "--pop-violet"].map((v) => css.getPropertyValue(v).trim());
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    resize();
    const bits = Array.from({ length: 160 }, (_, i) => ({
      x: c.width / 2 + (Math.random() - 0.5) * 200, y: c.height * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, color: colors[i % 4]!,
    }));
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      }
      if (t - start < 4500) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(tick);
    addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50" />;
}
