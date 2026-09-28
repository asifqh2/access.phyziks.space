'use client';
import { useEffect, useRef } from 'react';

export default function MindMapDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const fps = 30;
    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, 800, 400);
      const t = frame / fps;

      // Step 1: Create Note (0-1s)
      if (t >= 0) {
        const progress = Math.min((t - 0) / 0.5, 1);
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(150, 100, 40 * progress, 0, Math.PI * 2);
        ctx.fill();
        if (progress === 1) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Note 1', 150, 105);
        }
        if (t >= 0.8) {
          ctx.fillStyle = '#3b82f6';
          ctx.font = '600 12px sans-serif';
          ctx.fillText('1. Create Note', 150, 160);
        }
      }

      // Step 2: Create Topic (1.5-2.3s)
      if (t >= 1.5) {
        const progress = Math.min((t - 1.5) / 0.5, 1);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(330, 70, 100 * progress, 60, 8);
        ctx.fill();
        if (progress === 1 && t >= 2) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Topic A', 380, 105);
        }
        if (t >= 2.3) {
          ctx.fillStyle = '#10b981';
          ctx.font = '600 12px sans-serif';
          ctx.fillText('2. Create Topic', 380, 160);
        }
      }

      // Step 3: Connect (3-3.8s)
      if (t >= 3) {
        const progress = Math.min((t - 3) / 0.8, 1);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(190, 100);
        ctx.lineTo(190 + (140 * progress), 100);
        ctx.stroke();
        // Arrow
        if (progress > 0.9) {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(330, 100);
          ctx.lineTo(320, 95);
          ctx.lineTo(320, 105);
          ctx.fill();
        }
        if (t >= 3.8) {
          ctx.fillStyle = '#3b82f6';
          ctx.font = '600 12px sans-serif';
          ctx.fillText('3. Connect', 260, 90);
        }
      }

      // Step 4: Add Note 2 (4.5-5.5s)
      if (t >= 4.5) {
        const progress = Math.min((t - 4.5) / 0.5, 1);
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(150, 250, 40 * progress, 0, Math.PI * 2);
        ctx.fill();
        if (progress === 1) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('Note 2', 150, 255);
        }
      }

      // Connect Note 2 (5.5-6.3s)
      if (t >= 5.5) {
        const progress = Math.min((t - 5.5) / 0.8, 1);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(180, 230);
        const cpx = 280, cpy = 200;
        const endX = 330, endY = 120;
        const x = 180 + (endX - 180) * progress;
        const y = 230 + (endY - 230) * progress * progress;
        ctx.quadraticCurveTo(cpx * progress + 180 * (1 - progress), cpy * progress + 230 * (1 - progress), x, y);
        ctx.stroke();
      }

      // Step 5: Disconnect (6.5-8.8s)
      if (t >= 6.5) {
        const progress = Math.min((t - 6.5) / 0.5, 1);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(600, 100, 40 * progress, 0, Math.PI * 2);
        ctx.fill();
        if (progress === 1) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('Note 3', 600, 105);
        }
      }

      if (t >= 7.5) {
        const progress = Math.min((t - 7.5) / 0.8, 1);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(430, 100);
        ctx.lineTo(430 + (130 * progress), 100);
        ctx.stroke();
      }

      if (t >= 8.5) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(485, 85);
        ctx.lineTo(505, 105);
        ctx.moveTo(505, 85);
        ctx.lineTo(485, 105);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = '600 12px sans-serif';
        ctx.fillText('4. Disconnect', 600, 160);
      }

      frame++;
      if (t >= 10) frame = 0;
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-4">How to Use Mind Maps</h3>
      <canvas ref={canvasRef} width={800} height={400} className="w-full h-auto border rounded-lg bg-white shadow-lg" />
    </div>
  );
}
