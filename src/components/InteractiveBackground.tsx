// src/components/InteractiveBackground.tsx
import React from "react";

type Props = {
  // если хочешь, можно передать дополнительные настройки
  particleCount?: number;
  enabled?: boolean;
};

export const InteractiveBackground: React.FC<Props> = ({ particleCount = 80, enabled = true }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const mouseRef = React.useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2, down: false });
  const particlesRef = React.useRef<any[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const floatRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const spotlightRef = React.useRef<HTMLDivElement | null>(null);

  // уменьшение нагрузки на мобиле
  const actualParticles = React.useMemo(() => (window.innerWidth < 700 ? Math.max(20, Math.floor(particleCount / 3)) : particleCount), [particleCount]);

  // init particles
  React.useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    // create particles
    const particles: any[] = [];
    for (let i = 0; i < actualParticles; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        hue: 180 + Math.random() * 80, // cyan-ish
      });
    }
    particlesRef.current = particles;

    // animation loop
    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      // subtle background gradient overlay (composite)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(10,12,30,0.2)");
      grad.addColorStop(1, "rgba(6,20,35,0.2)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // draw particles
      for (const p of particles) {
        // attraction/repulsion to mouse
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const force = Math.min(150, dist);
        const dirX = dx / dist;
        const dirY = dy / dist;

        // if mouse is pressed -> attract, else slight repulse/flow
        const pull = mouseRef.current.down ? 0.12 : -0.02;
        p.vx += dirX * pull * (100 / (force + 20));
        p.vy += dirY * pull * (100 / (force + 20));

        // small wandering
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;

        // velocity damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        // integrate
        p.x += p.vx;
        p.y += p.vy;

        // wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // draw glow
        ctx.beginPath();
        const hue = p.hue;
        const alpha = 0.08 + Math.min(0.6, 0.6 * (3 / (p.r + 1)));
        ctx.fillStyle = `hsla(${hue},60%,60%,${alpha})`;
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();

        // small core
        ctx.beginPath();
        ctx.fillStyle = `hsla(${hue},70%,70%,${0.9})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // connecting lines for close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1200) {
            const alpha = 0.18 * (1 - d2 / 1200);
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [actualParticles, enabled]);

  // mouse handlers
  React.useEffect(() => {
    if (!enabled) return;
    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const handleDown = () => (mouseRef.current.down = true);
    const handleUp = () => (mouseRef.current.down = false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        mouseRef.current.x = t.clientX;
        mouseRef.current.y = t.clientY;
      }
    }, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [enabled]);

  // floating elements (DOM) — parallax following cursor with lag
  React.useEffect(() => {
    if (!enabled) return;
    const floats = floatRefs.current;
    let running = true;
    const positions = floats.map(() => ({ tx: 0, ty: 0, x: 0, y: 0 }));

    const tick = () => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      for (let i = 0; i < floats.length; i++) {
        const el = floats[i];
        if (!el) continue;
        // each element has different intensity
        const intensity = 0.04 + (i % 5) * 0.02;
        positions[i].tx = (mx - window.innerWidth / 2) * intensity;
        positions[i].ty = (my - window.innerHeight / 2) * intensity;
        // ease
        positions[i].x += (positions[i].tx - positions[i].x) * 0.08;
        positions[i].y += (positions[i].ty - positions[i].y) * 0.08;
        el.style.transform = `translate3d(${positions[i].x}px, ${positions[i].y}px, 0) rotate(${positions[i].x * 0.002}deg)`;
      }
      if (running) requestAnimationFrame(tick);
    };
    tick();
    return () => {
      running = false;
    };
  }, [enabled]);

  // create refs for some floating DOM blocks
  const ensureFloatRef = (index: number) => (el: HTMLDivElement | null) => {
    floatRefs.current[index] = el;
  };

  // spotlight follow (CSS radial gradient) — update position style
  React.useEffect(() => {
    if (!enabled) return;
    let raf: number | null = null;
    const loop = () => {
      const s = spotlightRef.current;
      if (s) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        s.style.left = `${mx}px`;
        s.style.top = `${my}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [enabled]);

  // render
  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-0">
      {/* canvas particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* spotlight glow (follows cursor) */}
      <div
        ref={spotlightRef}
        className="absolute w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen opacity-70 pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(150,240,255,0.18), rgba(80,100,120,0.02) 50%, transparent 60%)',
          filter: 'blur(40px)',
          zIndex: 2
        }}
      />

      {/* decorative floating elements — several layers */}
      <div className="absolute left-10 top-20 z-10" ref={ensureFloatRef(0)}>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-indigo-400/20 border border-white/10 shadow-xl" />
      </div>

      <div className="absolute right-16 top-40 z-10" ref={ensureFloatRef(1)}>
        <div className="w-28 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs">✨ Features</div>
      </div>

      <div className="absolute left-1/2 top-12 -translate-x-1/2 z-10" ref={ensureFloatRef(2)}>
        {/* svg liquid-ish blob */}
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0%" stopColor="#34d0f0" stopOpacity="0.28"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.18"/>
            </linearGradient>
          </defs>
          <path d="M12 60 Q40 10 110 30 T208 60 Q150 110 110 100 T12 60 Z" fill="url(#g1)"/>
        </svg>
      </div>

      <div className="absolute right-28 bottom-24 z-10" ref={ensureFloatRef(3)}>
        <div className="w-14 h-14 rounded-full bg-cyan-300/20 border border-white/10" />
      </div>

      <div className="absolute left-24 bottom-40 z-10" ref={ensureFloatRef(4)}>
        <div className="w-32 h-10 rounded-xl bg-white/6 border border-white/10 text-[12px] flex items-center justify-center">Custom Themes</div>
      </div>
    </div>
  );
};
//{/* 3D Glass Card */}
//      <motion.div
//        className="relative z-10 w-full max-w-xl rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-10"
//        style={{
//          transform: `
//            perspective(1000px)
//            rotateX(${offsetY * 0.3}deg)
//            rotateY(${offsetX * -0.3}deg)
//          `,
//        }}

export default InteractiveBackground;
