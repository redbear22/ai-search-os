"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
};

const PT_COUNT = 76;
const REF_W = 1920;
const REF_H = 1080;
const CONNECT_DIST = 110;

function createPoints(): Point[] {
  return Array.from({ length: PT_COUNT }, () => ({
    x: Math.random() * REF_W,
    y: Math.random() * REF_H,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    r: Math.random() * 1.1 + 0.35,
    a: Math.random() * 0.36 + 0.1,
  }));
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let rafId = 0;
    const pts = createPoints();

    const resize = () => {
      W = canvas.width = wrap.offsetWidth;
      H = canvas.height = wrap.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      const sx = W / REF_W;
      const sy = H / REF_H;

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > REF_W) p.vx *= -1;
        if (p.y < 0 || p.y > REF_H) p.vy *= -1;
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = (pts[i].x - pts[j].x) * sx;
          const dy = (pts[i].y - pts[j].y) * sy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x * sx, pts[i].y * sy);
            ctx.lineTo(pts[j].x * sx, pts[j].y * sy);
            ctx.strokeStyle = `rgba(59,130,246,${(1 - d / CONNECT_DIST) * 0.1})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(pts[i].x * sx, pts[i].y * sy, pts[i].r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,140,230,${pts[i].a})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={wrapRef} className="hero-canvas-wrap" aria-hidden>
      <canvas ref={canvasRef} className="hero-canvas" />
    </div>
  );
}
