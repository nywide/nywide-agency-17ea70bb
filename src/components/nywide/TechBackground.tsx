import { useEffect, useRef } from "react";

export function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; pulseSpeed: number; pulseOffset: number;
      type: "dot" | "currency"; symbol?: string;
    }

    interface GrowthBar {
      x: number; height: number; targetHeight: number;
      width: number; opacity: number; speed: number;
    }

    let particles: Particle[] = [];
    let growthBars: GrowthBar[] = [];
    const currencySymbols = ["$", "€", "£", "¥"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < Math.min(numParticles, 100); i++) {
        const isCurrency = Math.random() < 0.15;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: isCurrency ? -Math.random() * 0.5 - 0.2 : (Math.random() - 0.5) * 0.3,
          size: isCurrency ? Math.random() * 12 + 10 : Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.25 + 0.05,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseOffset: Math.random() * Math.PI * 2,
          type: isCurrency ? "currency" : "dot",
          symbol: isCurrency ? currencySymbols[Math.floor(Math.random() * currencySymbols.length)] : undefined,
        });
      }
    };

    const initGrowthBars = () => {
      growthBars = [];
      const numBars = 8;
      const barWidth = canvas.width / (numBars * 3);
      for (let i = 0; i < numBars; i++) {
        growthBars.push({
          x: canvas.width * 0.1 + (i * (canvas.width * 0.8 / numBars)),
          height: 0,
          targetHeight: Math.random() * 150 + 50,
          width: barWidth,
          opacity: 0.03 + Math.random() * 0.02,
          speed: Math.random() * 0.01 + 0.005,
        });
      }
    };

    const updateParticle = (p: Particle, time: number) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -50) p.x = canvas.width + 50;
      if (p.x > canvas.width + 50) p.x = -50;
      if (p.y < -50) p.y = canvas.height + 50;
      if (p.y > canvas.height + 50) p.y = -50;
      p.opacity = 0.05 + Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.1 + 0.1;
    };

    const drawParticle = (p: Particle) => {
      if (p.type === "currency" && p.symbol) {
        ctx.font = `${p.size}px "Inter", sans-serif`;
        ctx.fillStyle = `rgba(255, 184, 0, ${p.opacity * 0.4})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 184, 0, ${p.opacity})`;
        ctx.fill();
      }
    };

    const drawGrid = (time: number) => {
      const gridSize = 80;
      const offsetX = (time * 0.008) % gridSize;
      const offsetY = (time * 0.006) % gridSize;
      ctx.strokeStyle = "rgba(255, 184, 0, 0.025)";
      ctx.lineWidth = 1;
      for (let x = -gridSize + offsetX; x < canvas.width + gridSize; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = -gridSize + offsetY; y < canvas.height + gridSize; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    };

    const drawGrowthBars = (time: number) => {
      growthBars.forEach((bar, i) => {
        const oscillation = Math.sin(time * bar.speed + i) * 20;
        bar.height += (bar.targetHeight + oscillation - bar.height) * 0.02;
        const gradient = ctx.createLinearGradient(bar.x, canvas.height, bar.x, canvas.height - bar.height);
        gradient.addColorStop(0, `rgba(255, 184, 0, ${bar.opacity})`);
        gradient.addColorStop(1, `rgba(255, 184, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(bar.x, canvas.height - bar.height, bar.width, bar.height);
      });
    };

    const drawStockLine = (time: number) => {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 184, 0, 0.08)";
      ctx.lineWidth = 2;
      const segments = 50;
      const segmentWidth = canvas.width / segments;
      for (let i = 0; i <= segments; i++) {
        const x = i * segmentWidth;
        const baseY = canvas.height * 0.6;
        const y = baseY + Math.sin((i * 0.3) + time * 0.001) * 40 + Math.sin((i * 0.15) + time * 0.0015) * 60 + Math.cos((i * 0.1) + time * 0.0008) * 30;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      const fillGradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
      fillGradient.addColorStop(0, "rgba(255, 184, 0, 0.03)");
      fillGradient.addColorStop(1, "rgba(255, 184, 0, 0)");
      ctx.fillStyle = fillGradient;
      ctx.fill();
    };

    const connectParticles = () => {
      const maxDistance = 120;
      const dotParticles = particles.filter(p => p.type === "dot");
      for (let i = 0; i < dotParticles.length; i++) {
        for (let j = i + 1; j < dotParticles.length; j++) {
          const dx = dotParticles[i].x - dotParticles[j].x;
          const dy = dotParticles[i].y - dotParticles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.1;
            ctx.strokeStyle = `rgba(255, 184, 0, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(dotParticles[i].x, dotParticles[i].y);
            ctx.lineTo(dotParticles[j].x, dotParticles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const drawTargetCircles = (time: number) => {
      const targets = [
        { x: canvas.width * 0.15, y: canvas.height * 0.3 },
        { x: canvas.width * 0.85, y: canvas.height * 0.25 },
        { x: canvas.width * 0.75, y: canvas.height * 0.7 },
      ];
      targets.forEach((target, i) => {
        const pulse = Math.sin(time * 0.002 + i * 2) * 0.5 + 0.5;
        const radius = 30 + pulse * 20;
        ctx.beginPath(); ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 184, 0, ${0.02 + pulse * 0.02})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(target.x, target.y, radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 184, 0, ${0.03 + pulse * 0.02})`; ctx.stroke();
        ctx.beginPath(); ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 184, 0, ${0.1 + pulse * 0.1})`; ctx.fill();
      });
    };

    const drawGlowingLines = (time: number) => {
      for (let i = 0; i < 2; i++) {
        const progress = ((time * 0.0001 + i * 0.5) % 1);
        const y = progress * canvas.height;
        const gradient = ctx.createLinearGradient(0, y, canvas.width, y);
        gradient.addColorStop(0, "rgba(255, 184, 0, 0)");
        gradient.addColorStop(0.3, "rgba(255, 184, 0, 0.04)");
        gradient.addColorStop(0.5, "rgba(255, 184, 0, 0.06)");
        gradient.addColorStop(0.7, "rgba(255, 184, 0, 0.04)");
        gradient.addColorStop(1, "rgba(255, 184, 0, 0)");
        ctx.strokeStyle = gradient; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    };

    const startTime = Date.now();

    const animate = () => {
      const time = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(time);
      drawGrowthBars(time);
      drawStockLine(time);
      drawTargetCircles(time);
      drawGlowingLines(time);
      particles.forEach((particle) => {
        updateParticle(particle, time);
        drawParticle(particle);
      });
      connectParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    initParticles();
    initGrowthBars();
    animate();

    const handleResize = () => { resize(); initParticles(); initGrowthBars(); };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
