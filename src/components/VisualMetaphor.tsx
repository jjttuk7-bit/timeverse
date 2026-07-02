import React, { useEffect, useState, useRef } from "react";

interface VisualMetaphorProps {
  metaphor: string;
  theme: string;
  isActive: boolean;
  progress: number; // 0 to 1
  elapsedTime: number; // in seconds
  distractions?: number;
}

export default function VisualMetaphor({
  metaphor,
  theme,
  isActive,
  progress,
  elapsedTime,
  distractions = 0,
}: VisualMetaphorProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPulse((p) => !p);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  // Smoothly interpolated elapsed time for buttery 60fps hand sweep.
  // The logic clock only updates every 100ms; here we extrapolate between updates.
  const [smoothElapsed, setSmoothElapsed] = useState(elapsedTime);
  const baseRef = useRef({ e: elapsedTime, t: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    baseRef.current = { e: elapsedTime, t: performance.now() };
    if (!isActive) setSmoothElapsed(elapsedTime);
  }, [elapsedTime, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const loop = () => {
      const now = performance.now();
      setSmoothElapsed(baseRef.current.e + (now - baseRef.current.t) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive]);

  // Determine theme colors
  const getThemeColor = () => {
    switch (theme) {
      case "warm-amber":
        return { bg: "bg-amber-500", text: "text-amber-500", glow: "shadow-amber-500/50", fill: "#f59e0b" };
      case "sunset-red":
        return { bg: "bg-rose-500", text: "text-rose-500", glow: "shadow-rose-500/50", fill: "#f43f5e" };
      case "sand-gold":
        return { bg: "bg-yellow-500", text: "text-yellow-500", glow: "shadow-yellow-500/50", fill: "#eab308" };
      case "neon-cyan":
        return { bg: "bg-cyan-400", text: "text-cyan-400", glow: "shadow-cyan-400/50", fill: "#22d3ee" };
      case "forest-green":
        return { bg: "bg-emerald-500", text: "text-emerald-500", glow: "shadow-emerald-500/50", fill: "#10b981" };
      case "space-indigo":
        return { bg: "bg-indigo-500", text: "text-indigo-500", glow: "shadow-indigo-500/50", fill: "#6366f1" };
      case "cosmic-slate":
      default:
        return { bg: "bg-slate-400", text: "text-slate-400", glow: "shadow-slate-400/50", fill: "#94a3b8" };
    }
  };

  const colors = getThemeColor();

  // Draw specific visual metaphors
  const renderContent = () => {
    switch (metaphor) {
      case "coffee":
        return (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Beaker Container */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-b-3xl rounded-t-lg overflow-hidden flex flex-col justify-end bg-white/5 shadow-[inset_0_0_25px_rgba(255,255,255,0.05)]">
              {/* Coffee Liquid */}
              <div
                className="w-full bg-amber-950/90 transition-all duration-1000 ease-out relative border-t-2 border-amber-600/60"
                style={{ height: `${Math.min(progress * 100, 100)}%` }}
              >
                {/* Bubble waves */}
                {isActive && (
                  <div className="absolute top-0 inset-x-0 h-2 flex justify-around overflow-hidden animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500/40 animate-ping"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/30 animate-bounce delay-100"></span>
                    <span className="w-2 h-2 rounded-full bg-amber-500/40 animate-ping delay-300"></span>
                  </div>
                )}
              </div>
            </div>
            {/* Steam animation above coffee */}
            {isActive && progress > 0.1 && (
              <div className="absolute -top-8 flex gap-3 justify-center w-full">
                <span className="w-1.5 h-6 bg-slate-200/20 rounded-full blur-xs animate-bounce"></span>
                <span className="w-1.5 h-8 bg-slate-200/20 rounded-full blur-xs animate-bounce delay-150"></span>
                <span className="w-1.5 h-5 bg-slate-200/20 rounded-full blur-xs animate-bounce delay-300"></span>
              </div>
            )}
            {/* Dripper shape overlay */}
            <div className="absolute -top-1 w-24 h-2 bg-slate-500 rounded-full"></div>
          </div>
        );

      case "fire":
        return (
          <div className="relative w-48 h-48 flex items-end justify-center pb-4">
            <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-800 rounded-full blur-md"></div>
            {/* Fire flame container */}
            <div className="relative flex items-end justify-center">
              {/* Flame Outer */}
              <div
                className={`w-32 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 blur-xs transition-all duration-500 origin-bottom`}
                style={{
                  height: `${Math.max(40, progress * 130 + 30)}px`,
                  transform: `scale(${isActive ? 1 + Math.sin(elapsedTime * 2) * 0.08 : 1})`,
                }}
              ></div>
              {/* Flame Inner Core */}
              <div
                className="absolute w-16 bg-white/90 rounded-full blur-xs transition-all duration-500 origin-bottom"
                style={{
                  height: `${Math.max(20, progress * 70 + 15)}px`,
                  transform: `scale(${isActive ? 1 + Math.cos(elapsedTime * 2) * 0.05 : 1})`,
                }}
              ></div>
            </div>
          </div>
        );

      case "hourglass":
        return (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Hourglass Container */}
            <div className="w-32 h-44 border-4 border-white/20 rounded-xl relative flex flex-col justify-between overflow-hidden p-1 bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
              {/* Top Bulb */}
              <div className="w-full h-[46%] rounded-b-2xl border-b border-white/10 relative overflow-hidden flex flex-col justify-end bg-white/5">
                <div
                  className="w-full bg-yellow-600/75 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.max(0, (1 - progress) * 100)}%` }}
                ></div>
              </div>
              {/* Neck with falling sand line */}
              <div className="w-full h-[8%] flex justify-center relative">
                {isActive && progress > 0 && progress < 1 && (
                  <div className="w-1 h-full bg-yellow-500/80 animate-pulse"></div>
                )}
              </div>
              {/* Bottom Bulb */}
              <div className="w-full h-[46%] rounded-t-2xl border-t border-white/10 relative overflow-hidden flex flex-col justify-end bg-white/5">
                <div
                  className="w-full bg-yellow-600/75 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min(progress * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        );

      case "leaves":
        const leafCount = Math.min(12, Math.floor(progress * 12) + 1);
        return (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Main stem */}
            <div className="w-1 h-36 bg-emerald-800/80 rounded-full relative flex items-center justify-center">
              {/* Growing leaves */}
              {Array.from({ length: leafCount }).map((_, i) => {
                const isLeft = i % 2 === 0;
                const positionY = (i / 12) * 100;
                return (
                  <div
                    key={i}
                    className={`absolute w-8 h-4 bg-emerald-500 border border-emerald-400 rounded-full transition-all duration-1000 ease-out origin-center`}
                    style={{
                      top: `${positionY}%`,
                      [isLeft ? "right" : "left"]: "4px",
                      transform: `rotate(${isLeft ? "-25deg" : "25deg"}) scale(${isActive ? 1 + Math.sin(elapsedTime + i) * 0.05 : 1})`,
                    }}
                  ></div>
                );
              })}
            </div>
            {/* Focus protective shield circle */}
            <div
              className={`absolute inset-0 border-2 border-emerald-500/20 rounded-full transition-all duration-1000 ${isActive ? "animate-spin-slow" : ""}`}
              style={{ borderStyle: "dashed" }}
            ></div>
            {distractions > 0 && (
              <div className="absolute top-1 right-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-mono">
                {distractions} interruptions
              </div>
            )}
          </div>
        );

      case "moon":
        // Moon phases cycle based on progress
        const moonRotation = progress * 360;
        return (
          <div className="relative w-48 h-48 flex flex-col items-center justify-center">
            <div
              className={`w-36 h-36 rounded-full border-4 border-white/20 relative flex items-center justify-center transition-all duration-1000 bg-white/5 backdrop-blur-md shadow-2xl ${colors.glow}`}
            >
              {/* Outer soft breathing halo */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-1000 opacity-60 ${pulse ? "scale-105 border-indigo-400/50 bg-indigo-500/10" : "scale-95 border-white/10 bg-transparent"}`}
                style={{ borderWidth: "1px" }}
              ></div>
 
              {/* Dynamic Moon shadow crescent display */}
              <div className="w-28 h-28 rounded-full relative overflow-hidden bg-white/5 border border-white/10">
                {/* Lit side */}
                <div className="absolute inset-y-0 right-0 w-14 bg-indigo-200/40 rounded-r-full"></div>
                {/* Dark side shadow overlay that changes with progress */}
                <div
                  className="absolute inset-y-0 w-28 bg-black/40 transition-all duration-500 rounded-full"
                  style={{
                    left: `${Math.sin(progress * Math.PI) * 50}%`,
                    opacity: 0.85,
                  }}
                ></div>
                {/* Subtle moon craters */}
                <div className="absolute top-6 left-12 w-4 h-4 rounded-full bg-white/10"></div>
                <div className="absolute bottom-8 right-6 w-6 h-6 rounded-full bg-white/5"></div>
                <div className="absolute top-16 right-10 w-3 h-3 rounded-full bg-white/10"></div>
              </div>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono mt-3 uppercase tracking-wider animate-pulse">
              {pulse ? "Inhale..." : "Exhale..."}
            </span>
          </div>
        );

      case "galaxy":
        return (
          <div className="relative w-48 h-48 flex items-center justify-center overflow-hidden">
            <div
              className={`w-40 h-40 rounded-full border border-white/10 relative flex items-center justify-center`}
              style={{
                transform: `rotate(${elapsedTime * 15}deg)`,
                transition: "transform 0.1s linear",
              }}
            >
              {/* Star dots */}
              <div className="absolute top-2 left-10 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-lg"></div>
              <div className="absolute bottom-4 right-12 w-1 h-1 bg-rose-400 rounded-full shadow-lg"></div>
              <div className="absolute top-16 right-4 w-2 h-2 bg-amber-400 rounded-full shadow-lg animate-ping"></div>
              <div className="absolute bottom-16 left-2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-lg"></div>
 
              {/* Central high precision portal ring */}
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping"></div>
                </div>
              </div>
            </div>
            {/* Concentric scientific orbital rings */}
            <div className="absolute inset-0 border border-white/10 rounded-full pointer-events-none scale-100"></div>
            <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none scale-90"></div>
          </div>
        );

      case "clock": {
        // Premium analog chronograph: sweeping hand over a real dial, digital readout lives below
        const secondsAngle = (smoothElapsed % 60) * 6; // 6 deg/sec, interpolated for smooth sweep
        const minutesAngle = ((smoothElapsed / 60) % 60) * 6; // 6 deg/min
        const numerals = [
          { n: "60", a: 0 },
          { n: "15", a: 90 },
          { n: "30", a: 180 },
          { n: "45", a: 270 },
        ];
        return (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Dial body */}
            <div
              className={`w-44 h-44 rounded-full border-[6px] border-white/15 relative flex items-center justify-center bg-gradient-to-b from-white/10 to-white/[0.02] backdrop-blur-md shadow-[inset_0_2px_14px_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.55)] ${colors.glow}`}
            >
              {/* Inner ring */}
              <div className="absolute inset-2.5 rounded-full border border-white/10" />

              {/* 60 tick marks (major every 5) */}
              {Array.from({ length: 60 }).map((_, i) => {
                const major = i % 5 === 0;
                return (
                  <div
                    key={i}
                    className={
                      major
                        ? "absolute w-[3px] h-3 bg-white/70 rounded-full"
                        : "absolute w-px h-1.5 bg-white/25 rounded-full"
                    }
                    style={{ transform: `rotate(${i * 6}deg) translateY(-76px)` }}
                  />
                );
              })}

              {/* Numerals */}
              {numerals.map((x) => (
                <div
                  key={x.n}
                  className="absolute text-[11px] font-mono font-bold text-white/55"
                  style={{ transform: `rotate(${x.a}deg) translateY(-56px) rotate(${-x.a}deg)` }}
                >
                  {x.n}
                </div>
              ))}

              {/* Brand mark */}
              <div className="absolute top-[33%] text-[7px] font-mono tracking-[0.25em] text-white/30 uppercase">
                Timeverse
              </div>

              {/* Minute hand */}
              <div
                className="absolute w-1 h-8 bg-white/80 rounded-full z-10"
                style={{
                  transformOrigin: "bottom center",
                  transform: `translateY(-100%) rotate(${minutesAngle}deg)`,
                  top: "50%",
                }}
              />

              {/* Second hand + counterweight tail */}
              <div
                className="absolute w-[2px] h-[70px] bg-red-500 rounded-full z-20 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                style={{
                  transformOrigin: "bottom center",
                  transform: `translateY(-100%) rotate(${secondsAngle}deg)`,
                  top: "50%",
                }}
              />
              <div
                className="absolute w-1 h-4 bg-red-500 rounded-full z-20"
                style={{
                  transformOrigin: "top center",
                  transform: `rotate(${secondsAngle}deg)`,
                  top: "50%",
                }}
              />

              {/* Center hub */}
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white z-30 shadow-md" />
            </div>
          </div>
        );
      }

      case "ocean":
      case "ripple":
      default:
        // Pulsing circles
        return (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer ring */}
            <div
              className={`absolute rounded-full border-2 transition-all duration-1000 ${colors.text} ${isActive ? "animate-ping opacity-25" : "opacity-10"}`}
              style={{
                width: "180px",
                height: "180px",
                borderColor: colors.fill,
              }}
            ></div>
            {/* Mid ring */}
            <div
              className="absolute rounded-full border transition-all duration-1000"
              style={{
                width: "130px",
                height: "130px",
                borderColor: colors.fill,
                opacity: isActive ? 0.4 : 0.15,
                transform: `scale(${isActive ? 1 + Math.sin(elapsedTime * 3) * 0.08 : 1})`,
              }}
            ></div>
            {/* Inner Core */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${colors.bg} ${colors.glow}`}
            >
              <span className="text-slate-950 font-bold uppercase tracking-wider text-xs">
                {isActive ? "Flowing" : "Paused"}
              </span>
            </div>
          </div>
        );
    }
  };

  // Progress ring geometry
  const R = 116;
  const CIRC = 2 * Math.PI * R;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="flex flex-col items-center justify-center py-4 relative">
      <div className="relative flex items-center justify-center" style={{ width: 248, height: 248 }}>
        {/* Progress ring */}
        <svg
          viewBox="0 0 248 248"
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        >
          <circle cx="124" cy="124" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
          <circle
            cx="124"
            cy="124"
            r={R}
            fill="none"
            stroke={colors.fill}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - clamped)}
            style={{
              transition: "stroke-dashoffset 0.2s linear",
              filter: `drop-shadow(0 0 6px ${colors.fill})`,
              opacity: clamped > 0 ? 0.9 : 0.25,
            }}
          />
        </svg>

        {/* Metaphor stage */}
        <div
          className={`relative flex items-center justify-center p-6 bg-white/5 rounded-full border border-white/10 shadow-[inset_0_0_25px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-shadow duration-700 ${
            isActive ? colors.glow : ""
          }`}
          style={isActive ? { boxShadow: `0 0 40px -8px ${colors.fill}` } : undefined}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
