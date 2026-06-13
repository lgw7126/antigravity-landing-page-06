import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Sparkles, LayoutGrid } from 'lucide-react';

const NAV_LINKS = ['Gallery', 'Styles', 'API', 'Pricing', 'Blog'];
const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4';

const LogoMark = () => (
  <svg width="44" height="26" viewBox="0 0 44 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <rect x="0" y="3" width="14" height="20" rx="3" fill="white" />
    <rect x="16" y="3" width="12" height="20" rx="3" fill="white" />
    <rect x="30" y="3" width="14" height="20" rx="3" fill="white" />
  </svg>
);

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [framesReady, setFramesReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoBgRef = useRef<HTMLDivElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  // Effect 0: Trigger entry transitions
  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect 1: Frame capture (boomerang setup with pixel-level color adjustment)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const frames: HTMLCanvasElement[] = [];
    let rVFCId: number | null = null;
    let rafId: number | null = null;

    const captureFrame = () => {
      if (!capturing) return;

      const readyState = video.readyState;
      const currentTime = video.currentTime;

      // Capture only when we have data and time has progressed
      if (readyState >= 2 && currentTime !== lastTime) {
        lastTime = currentTime;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const scale = Math.min(1, MAX_WIDTH / videoWidth);
        const w = videoWidth * scale;
        const h = videoHeight * scale;

        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          
          // Pixel processing: Shift pink flower pixels to a beautiful lavender light purple
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Pink color threshold: high red, moderate/high blue, low green
            if (r > 100 && b > 70 && r > g * 1.15 && b > g * 0.8) {
              // Lavender formula: shift to vibrant light purple
              data[i] = Math.min(255, Math.round(r * 0.85));
              data[i + 1] = Math.round(g * 0.95);
              data[i + 2] = Math.min(255, Math.round(b * 1.45));
            }
          }
          ctx.putImageData(imgData, 0, 0);
          frames.push(offscreen);

          // Draw the processed frame to the display canvas in real-time
          const displayCanvas = displayCanvasRef.current;
          if (displayCanvas) {
            displayCanvas.width = w;
            displayCanvas.height = h;
            const displayCtx = displayCanvas.getContext('2d');
            if (displayCtx) {
              displayCtx.clearRect(0, 0, w, h);
              displayCtx.drawImage(offscreen, 0, 0);
            }
          }
        }
      }

      scheduleNextCapture();
    };

    const scheduleNextCapture = () => {
      if (!capturing) return;
      if ('requestVideoFrameCallback' in video) {
        rVFCId = (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        rafId = requestAnimationFrame(captureFrame);
      }
    };

    const onLoaded = () => {
      video.play().catch((err) => {
        console.warn("Autoplay was prevented by browser security rules:", err);
      });
      scheduleNextCapture();
    };

    const onEnded = () => {
      capturing = false;
      if (frames.length > 0) {
        framesRef.current = frames;
        setFramesReady(true);
      }
    };

    // Attach event listeners
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('ended', onEnded);

    // If metadata is already loaded (e.g. from cache or hot reload)
    if (video.readyState >= 1) {
      onLoaded();
    }

    return () => {
      capturing = false;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('ended', onEnded);
      if (rVFCId !== null && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(rVFCId);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Effect 2: Boomerang render
  useEffect(() => {
    if (!framesReady) return;

    const displayCanvas = displayCanvasRef.current;
    const frames = framesRef.current;
    if (!displayCanvas || frames.length === 0) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    // Set output canvas resolution based on the captured frame size
    displayCanvas.width = frames[0].width;
    displayCanvas.height = frames[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / 30; // 30 FPS playback target
    let renderRafId: number;

    const render = (now: number) => {
      renderRafId = requestAnimationFrame(render);

      const elapsed = now - last;
      if (elapsed >= interval) {
        last = now - (elapsed % interval);

        // Draw the frame
        ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        ctx.drawImage(frames[index], 0, 0);

        // Update direction at loop endpoints
        index += direction;
        if (index >= frames.length - 1) {
          index = frames.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
    };

    renderRafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(renderRafId);
    };
  }, [framesReady]);

  // Effect 3: Parallax mouse tracking (gsap)
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const strength = 20;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((e.clientX - cx) / cx) * strength;
      targetY = ((e.clientY - cy) / cy) * strength;
    };

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      if (videoBgRef.current) {
        gsap.set(videoBgRef.current, { x: currentX, y: currentY });
      }

      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden select-none">
      {/* 1. Video background layer */}
      <div ref={videoBgRef} className="fixed top-0 left-0 w-full h-full z-0 scale-[1.08] origin-center">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          style={{ display: 'none' }}
        />
        <canvas
          ref={displayCanvasRef}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      </div>

      {/* Background vignette gradient to ensure UI text readability */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none z-10" />

      {/* 2. Hero title */}
      <div
        className={`fixed left-0 right-0 z-20 w-full px-4 transition-all duration-1000 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ top: '126px' }}
      >
        <h1 className="hero-title select-none">MicroVisuals</h1>
      </div>

      {/* 3. Nav */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
        <div className="liquid-glass flex items-center gap-6 rounded px-4 py-2.5">
          <LogoMark />
          <div className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-body font-light text-white/70 hover:text-white transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <a
              href="#signin"
              className="text-sm font-body font-light text-white/70 hover:text-white transition-colors duration-200"
            >
              Sign in
            </a>
            <a
              href="#try"
              className="liquid-glass-strong text-sm font-body font-medium text-white rounded px-4 py-1.5 transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_16px_2px_rgba(255,255,255,0.12)] active:scale-[0.97]"
            >
              Try it free
            </a>
          </div>
        </div>
      </nav>

      {/* 4. Bottom row */}
      <div
        className={`fixed bottom-12 left-0 right-0 px-10 flex items-end justify-between z-20 transition-all duration-1000 delay-300 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Left paragraph */}
        <p className="text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed">
          Forma's AI understands context, composition, and style like a creative director would.
        </p>

        {/* Center absolute cluster */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex items-center gap-3">
          <button
            className="group relative bg-white text-black text-sm font-body font-medium rounded px-6 py-3 overflow-hidden active:scale-[0.97] transition-all duration-200 shadow-[0_0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] hover:scale-[1.03]"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              Start generating
              <Sparkles className="w-4 h-4 fill-black/15 text-black shrink-0 transition-transform duration-300 group-hover:rotate-12" />
            </span>
            <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>

          <button
            className="liquid-glass group text-white text-sm font-body font-medium rounded px-6 py-3 active:scale-[0.97] transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)]"
          >
            <span className="flex items-center gap-1.5">
              See templates
              <LayoutGrid className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
            </span>
          </button>
        </div>

        {/* Right paragraph */}
        <p className="text-sm font-body font-light text-white/75 max-w-[220px] leading-relaxed text-right">
          Describe what you see in your head — get images that actually match.
        </p>
      </div>
    </div>
  );
}
