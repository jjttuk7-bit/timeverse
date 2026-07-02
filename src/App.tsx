import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Coffee,
  Flame,
  Baby,
  Dumbbell,
  Brain,
  Heart,
  Compass,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  Layers,
  X,
  ListMusic,
  Plus,
  Trash2,
  Wand2,
  Pencil,
} from "lucide-react";
import { PersonaId, TimeRecipe, TimeSession, Milestone } from "./types";
import { DEFAULT_PERSONAS, DEFAULT_RECIPES } from "./data";
import VisualMetaphor from "./components/VisualMetaphor";
import { soundService } from "./lib/soundService";

const SESSIONS_KEY = "timeverse_sessions";
const CUSTOM_KEY = "timeverse_custom_recipes";

type BuilderStep = { label: string; instruction: string; seconds: number };

const fmtDur = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}초`;
  return sec === 0 ? `${m}분` : `${m}분 ${sec}초`;
};

// Map a recipe's visual metaphor to the closest persona
const metaphorToPersona: Record<string, PersonaId> = {
  coffee: "coffee",
  fire: "cooking",
  hourglass: "baby",
  leaves: "study",
  moon: "meditation",
  galaxy: "scientist",
  ripple: "workout",
  ocean: "meditation",
  clock: "standard",
};

export default function App() {
  // Stopwatch core
  const [tenths, setTenths] = useState(0); // 100ms units
  const [isRunning, setIsRunning] = useState(false);

  // Persona / recipe
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>("standard");

  // Rail order: general stopwatch first, then the themed personas
  const orderedPersonas = useMemo(() => {
    const std = DEFAULT_PERSONAS.filter((p) => p.id === "standard");
    const rest = DEFAULT_PERSONAS.filter((p) => p.id !== "standard");
    return [...std, ...rest];
  }, []);
  const [activeRecipe, setActiveRecipe] = useState<TimeRecipe | null>(null);

  // Audio settings
  const [isMuted, setIsMuted] = useState(soundService.getMuted());
  const [volume, setVolume] = useState(soundService.getVolume());
  const [enableTicking, setEnableTicking] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timeverse_ticking") !== "false";
    }
    return true;
  });

  // History (persisted)
  const [sessions, setSessions] = useState<TimeSession[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return [];
  });

  // Custom recipes (persisted, user-authored)
  const [customRecipes, setCustomRecipes] = useState<TimeRecipe[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CUSTOM_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    return [];
  });

  // Bottom sheets
  const [showRecipes, setShowRecipes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // History note editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");

  // Builder form
  const [builderName, setBuilderName] = useState("");
  const [builderPersona, setBuilderPersona] = useState<PersonaId>("standard");
  const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([
    { label: "", instruction: "", seconds: 60 },
  ]);

  const timerRef = useRef<any>(null);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      /* ignore */
    }
  }, [sessions]);

  // Persist custom recipes
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customRecipes));
    } catch {
      /* ignore */
    }
  }, [customRecipes]);

  const currentPersona = useMemo(
    () => DEFAULT_PERSONAS.find((p) => p.id === activePersonaId) || DEFAULT_PERSONAS[0],
    [activePersonaId]
  );

  const milestones = activeRecipe?.milestones ?? [];

  const totalRecipeSeconds = useMemo(() => {
    if (milestones.length === 0) return 300;
    return milestones[milestones.length - 1].time || 300;
  }, [milestones]);

  const formatTime = (totalTenths: number, precision: boolean) => {
    const mins = Math.floor(totalTenths / 600);
    const secs = Math.floor((totalTenths % 600) / 10);
    const ms = totalTenths % 10;
    const mm = mins < 10 ? `0${mins}` : `${mins}`;
    const ss = secs < 10 ? `0${secs}` : `${secs}`;
    return precision ? `${mm}:${ss}.${ms}` : `${mm}:${ss}`;
  };

  // Countdown formatter (whole seconds, m:ss)
  const fmtCountdown = (s: number) => {
    const t = Math.max(0, Math.ceil(s));
    const m = Math.floor(t / 60);
    const sec = t % 60;
    return `${m}:${sec < 10 ? `0${sec}` : sec}`;
  };

  // Ticking loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTenths((prev) => {
          const next = prev + 1;
          if (enableTicking && next % 10 === 0) {
            soundService.playPersonaTick(activePersonaId);
          }
          return next;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, enableTicking, activePersonaId]);

  // Milestone tracking
  const currentMilestoneIndex = useMemo(() => {
    if (milestones.length === 0) return -1;
    const sec = tenths / 10;
    let idx = -1;
    for (let i = 0; i < milestones.length; i++) {
      if (sec >= milestones[i].time) idx = i;
    }
    return idx;
  }, [tenths, milestones]);

  const activeMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : null;

  const nextMilestone =
    currentMilestoneIndex >= 0 && currentMilestoneIndex + 1 < milestones.length
      ? milestones[currentMilestoneIndex + 1]
      : null;

  // Current stage timing (for countdown + progress within the stage)
  const currentSeconds = tenths / 10;
  const stageStart = activeMilestone ? activeMilestone.time : 0;
  const stageEnd = nextMilestone ? nextMilestone.time : totalRecipeSeconds;
  const remainingToNext = nextMilestone ? Math.max(0, nextMilestone.time - currentSeconds) : null;
  const stageProgress =
    stageEnd > stageStart ? Math.min(1, Math.max(0, (currentSeconds - stageStart) / (stageEnd - stageStart))) : 0;

  // Play persona sound when a new milestone is crossed (stage transition signal)
  const prevMilestoneIdxRef = useRef<number>(-1);
  useEffect(() => {
    prevMilestoneIdxRef.current = -1;
  }, [activeRecipe]);
  useEffect(() => {
    if (isRunning && currentMilestoneIndex > prevMilestoneIdxRef.current && currentMilestoneIndex >= 0) {
      soundService.playPersonaSound(activePersonaId);
    }
    prevMilestoneIdxRef.current = currentMilestoneIndex;
  }, [currentMilestoneIndex, isRunning, activePersonaId]);

  // 3-2-1 countdown ticks just before a stage transition
  useEffect(() => {
    if (!isRunning || !activeRecipe || !nextMilestone) return;
    if (tenths % 10 !== 0) return; // whole seconds only
    const remain = Math.round(nextMilestone.time - tenths / 10);
    if (remain === 3 || remain === 2 || remain === 1) soundService.playTap();
  }, [tenths, isRunning, activeRecipe, nextMilestone]);

  // Controls
  const handleToggleRunning = () => {
    if (isRunning) {
      soundService.playPause();
    } else {
      tenths === 0 ? soundService.playStart() : soundService.playResume();
    }
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    soundService.playReset();
    setIsRunning(false);
    setTenths(0);
  };

  const handleComplete = () => {
    setIsRunning(false);
    const durationSec = Math.round(tenths / 10);
    if (durationSec <= 1) {
      handleReset();
      return;
    }
    soundService.playComplete();
    const reached = milestones.filter((m) => durationSec >= m.time).length;
    const newSession: TimeSession = {
      id: `session-${Date.now()}`,
      recipeId: activeRecipe?.id,
      recipeName: activeRecipe?.name || currentPersona.name,
      personaId: activePersonaId,
      timestamp: new Date().toISOString(),
      duration: durationSec,
      milestonesReached: reached,
      notes: "",
      distractions: 0,
    };
    setSessions((prev) => [newSession, ...prev].slice(0, 100));
    handleReset();
    setShowHistory(true);
  };

  // Persona / recipe selection
  const selectPersona = (id: PersonaId) => {
    setActivePersonaId(id);
    soundService.playPersonaSound(id);
    const persona = DEFAULT_PERSONAS.find((p) => p.id === id);
    if (activeRecipe && persona && activeRecipe.visualMetaphor !== persona.visualMetaphor) {
      setActiveRecipe(null);
    }
  };

  const activateRecipe = (recipe: TimeRecipe, personaOverride?: PersonaId) => {
    setActiveRecipe(recipe);
    setActivePersonaId(personaOverride || metaphorToPersona[recipe.visualMetaphor] || "minimalist");
    handleReset();
    setShowRecipes(false);
  };

  // Builder helpers
  const openBuilder = () => {
    setBuilderName("");
    setBuilderPersona("standard");
    setBuilderSteps([{ label: "", instruction: "", seconds: 60 }]);
    setShowBuilder(true);
  };

  const updateStep = (idx: number, patch: Partial<BuilderStep>) => {
    setBuilderSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addStep = () => {
    soundService.playTap();
    setBuilderSteps((prev) => [...prev, { label: "", instruction: "", seconds: 60 }]);
  };
  const removeStep = (idx: number) => {
    setBuilderSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const builderValid =
    builderName.trim().length > 0 &&
    builderSteps.some((s) => s.label.trim().length > 0 && s.seconds > 0);

  const builderTotalSeconds = builderSteps.reduce((sum, s) => sum + (s.seconds > 0 ? s.seconds : 0), 0);

  const saveCustomRecipe = () => {
    if (!builderValid) return;
    const persona = DEFAULT_PERSONAS.find((p) => p.id === builderPersona) || DEFAULT_PERSONAS[0];
    const steps = builderSteps.filter((s) => s.label.trim().length > 0 && s.seconds > 0);

    let t = 0;
    const ms: Milestone[] = [];
    for (const s of steps) {
      ms.push({ time: t, label: s.label.trim(), instruction: s.instruction.trim() || s.label.trim() });
      t += s.seconds;
    }
    ms.push({ time: t, label: "완성", instruction: "완성되었습니다! 수고하셨어요." });

    const recipe: TimeRecipe = {
      id: `custom-${Date.now()}`,
      name: builderName.trim(),
      description: `${steps.length}단계 · 총 ${fmtDur(t)} · 나만의 리튜얼`,
      icon: persona.icon,
      visualMetaphor: persona.visualMetaphor,
      theme: persona.theme,
      milestones: ms,
      isCommunity: true,
      creator: "나",
      creatorRole: "나만의 레시피",
    };

    setCustomRecipes((prev) => [recipe, ...prev]);
    soundService.playComplete();
    setShowBuilder(false);
    activateRecipe(recipe, builderPersona);
  };

  const deleteCustomRecipe = (id: string) => {
    setCustomRecipes((prev) => prev.filter((r) => r.id !== id));
    if (activeRecipe?.id === id) setActiveRecipe(null);
  };

  // History: edit title/memo, delete a single session
  const startEditSession = (s: TimeSession) => {
    setEditingId(s.id);
    setDraftTitle(s.recipeName || "");
    setDraftNote(s.notes || "");
  };
  const saveEditSession = () => {
    setSessions((prev) =>
      prev.map((x) =>
        x.id === editingId ? { ...x, recipeName: draftTitle.trim() || x.recipeName, notes: draftNote.trim() } : x
      )
    );
    soundService.playTap();
    setEditingId(null);
  };
  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // Audio handlers
  const handleToggleMute = () => {
    const next = !isMuted;
    soundService.setMuted(next);
    setIsMuted(next);
    if (!next) soundService.playTap();
  };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    soundService.setVolume(v);
    setVolume(v);
  };
  const handleToggleTicking = () => {
    const next = !enableTicking;
    setEnableTicking(next);
    localStorage.setItem("timeverse_ticking", String(next));
    soundService.playTap();
  };

  const getLucideIcon = (name: string, className = "w-5 h-5") => {
    switch (name) {
      case "Coffee": return <Coffee className={className} />;
      case "Flame": return <Flame className={className} />;
      case "Baby": return <Baby className={className} />;
      case "Dumbbell": return <Dumbbell className={className} />;
      case "Brain": return <Brain className={className} />;
      case "Heart": return <Heart className={className} />;
      case "Compass": return <Compass className={className} />;
      default: return <Clock className={className} />;
    }
  };

  const getThemeTextGlow = (theme: string) => {
    switch (theme) {
      case "warm-amber": return "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case "sunset-red": return "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]";
      case "sand-gold": return "text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]";
      case "neon-cyan": return "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]";
      case "forest-green": return "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      case "space-indigo": return "text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]";
      default: return "text-slate-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]";
    }
  };

  const progress = activeRecipe
    ? Math.min((tenths / 10) / totalRecipeSeconds, 1)
    : Math.min((tenths / 10) / 180, 1);

  return (
    <div className="min-h-screen bg-[#141821] text-slate-100 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans selection:bg-indigo-500/60">
      {/* Ambient glows (soft slate, low saturation) */}
      <div className="absolute top-[-15%] left-[-20%] w-[70%] h-[50%] bg-slate-400/8 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[45%] bg-indigo-400/8 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 h-14 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-black rounded-full border-t-transparent animate-spin-slow" />
          </div>
          <h1 className="text-sm font-display font-extrabold tracking-tight uppercase">TIMEVERSE</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-white/5 border border-white/10 active:scale-95 transition"
            title={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-full bg-white/5 border border-white/10 active:scale-95 transition"
            title="기록"
          >
            <BookOpen className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </header>

      {/* Persona chips (wrap to rows — all visible, no cut-off) */}
      <div className="relative z-10 shrink-0 px-3 py-3 border-b border-white/5">
        <div className="flex flex-wrap gap-2 justify-center">
          {orderedPersonas.map((p) => {
            const selected = activePersonaId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => selectPersona(p.id)}
                className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
                  selected
                    ? "bg-white text-black border-white font-bold shadow-lg"
                    : "bg-white/5 text-white/60 border-white/10 active:bg-white/10"
                }`}
              >
                <span className={`p-1 rounded-full ${selected ? "bg-black/10" : "bg-white/5"}`}>
                  {getLucideIcon(p.icon, "w-3.5 h-3.5")}
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4 text-center">
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-3">
          {currentPersona.tagline}
        </span>

        <VisualMetaphor
          metaphor={currentPersona.visualMetaphor}
          theme={currentPersona.theme}
          isActive={isRunning}
          progress={progress}
          elapsedTime={tenths / 10}
        />

        {currentPersona.id !== "meditation" ? (
          <div className="mt-6 mb-2">
            <span
              key={Math.floor(tenths / 10)}
              className={`font-mono text-6xl font-semibold tracking-tight tabular-nums ${isRunning ? "animate-tick" : "inline-block"} ${getThemeTextGlow(currentPersona.theme)}`}
            >
              {formatTime(tenths, currentPersona.id === "scientist")}
            </span>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-1">
              {currentPersona.language.elapsedLabel}
            </p>
          </div>
        ) : (
          <div className="mt-6 mb-2 h-16 flex items-center justify-center px-4">
            <p className="text-sm italic text-indigo-300 animate-pulse">
              숫자를 내려놓으세요. 빛과 함께 호흡에만 집중합니다.
            </p>
          </div>
        )}

        {/* Active milestone card — current step + countdown to next transition */}
        {activeRecipe && activeMilestone && (
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-3 text-left backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-indigo-600/15 text-indigo-400 rounded-lg mt-0.5 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">
                    {currentMilestoneIndex + 1} / {milestones.length} 단계
                  </span>
                  <span className="text-xs font-bold">{activeMilestone.label}</span>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">{activeMilestone.instruction}</p>
              </div>
            </div>

            {nextMilestone ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">다음 단계까지</span>
                  <span className="font-mono text-xl font-bold tabular-nums text-white">
                    {fmtCountdown(remainingToNext!)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${stageProgress * 100}%`, transition: "width 0.15s linear" }}
                  />
                </div>
                <p className="text-[10px] font-mono text-white/40 mt-1.5 truncate">
                  다음 → {nextMilestone.label}
                </p>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                마지막 단계입니다 · 완료되면 ✓ 를 눌러 저장하세요
              </div>
            )}
          </div>
        )}
      </main>

      {/* Controls */}
      <div className="relative z-10 shrink-0 px-6 pb-2">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={handleReset}
            disabled={tenths === 0}
            className={`p-4 rounded-full border transition active:scale-95 ${
              tenths === 0
                ? "bg-white/5 border-white/5 text-white/20"
                : "bg-white/5 border-white/10 text-white/70 active:text-rose-400"
            }`}
            title="리셋"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleRunning}
            className={`flex-1 max-w-[180px] py-4 rounded-full font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${
              isRunning ? "bg-amber-500 text-black" : "bg-white text-black"
            }`}
          >
            {isRunning ? (
              <><Pause className="w-4 h-4" />{currentPersona.language.pause}</>
            ) : (
              <><Play className="w-4 h-4" />{tenths > 0 ? currentPersona.language.resume : currentPersona.language.start}</>
            )}
          </button>

          <button
            onClick={handleComplete}
            disabled={tenths === 0}
            className={`p-4 rounded-full border transition active:scale-95 ${
              tenths === 0
                ? "bg-white/5 border-white/5 text-white/20"
                : "bg-white/5 border-white/10 text-white/70 active:text-emerald-400"
            }`}
            title="완료 & 기록"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom bar: recipe + settings */}
      <div className="relative z-10 shrink-0 px-4 py-3 border-t border-white/10 space-y-3">
        <button
          onClick={() => setShowRecipes(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ListMusic className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">시간 레시피</p>
              <p className="text-xs font-bold truncate">
                {activeRecipe ? activeRecipe.name : "레시피 선택 (선택 사항)"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-white/50 shrink-0 ml-2">
            {activeRecipe ? `${milestones.length}단계` : "열기"}
          </span>
        </button>

        <div className="flex items-center gap-3 px-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            className="flex-1 h-1 bg-white/15 rounded-full appearance-none cursor-pointer accent-white"
            title={`볼륨 ${Math.round(volume * 100)}%`}
          />
          <button
            onClick={handleToggleTicking}
            className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-white/60"
            title="매 초 효과음"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            틱
            <span className={`w-6 h-3.5 rounded-full p-0.5 transition ${enableTicking ? "bg-emerald-500" : "bg-white/15"}`}>
              <span className={`block w-2.5 h-2.5 bg-white rounded-full transition ${enableTicking ? "translate-x-2.5" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Recipe bottom sheet */}
      <Sheet open={showRecipes} onClose={() => setShowRecipes(false)} title="시간 레시피">
        {/* Create your own */}
        <button
          onClick={openBuilder}
          className="w-full mb-3 py-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-sm font-bold text-indigo-300 active:bg-indigo-500/25 flex items-center justify-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          나만의 레시피 만들기
        </button>

        {activeRecipe && (
          <button
            onClick={() => { setActiveRecipe(null); setShowRecipes(false); }}
            className="w-full mb-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/60 active:bg-white/10"
          >
            레시피 언로드 (일반 스톱워치로)
          </button>
        )}

        {/* Custom recipes */}
        {customRecipes.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2 px-1">나만의 레시피</p>
            <div className="space-y-2.5">
              {customRecipes.map((r) => {
                const selected = activeRecipe?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      selected ? "bg-indigo-500/10 border-indigo-500/40" : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">{getLucideIcon(r.icon, "w-4 h-4")}</div>
                      <button onClick={() => activateRecipe(r)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate">{r.name}</p>
                        <p className="text-[10px] font-mono text-white/40 truncate">{r.description}</p>
                      </button>
                      <button
                        onClick={() => deleteCustomRecipe(r.id)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 active:text-rose-400 shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Built-in recipes */}
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2 px-1">추천 레시피</p>
        <div className="space-y-2.5">
          {DEFAULT_RECIPES.map((r) => {
            const selected = activeRecipe?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => activateRecipe(r)}
                className={`w-full text-left p-3.5 rounded-2xl border transition ${
                  selected ? "bg-indigo-500/10 border-indigo-500/40" : "bg-white/5 border-white/10 active:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">{getLucideIcon(r.icon, "w-4 h-4")}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.name}</p>
                    <p className="text-[10px] font-mono text-white/40">{r.creator} · {r.milestones.length}단계 · {r.milestones[r.milestones.length - 1].time}초</p>
                  </div>
                  {r.rating && (
                    <span className="text-[10px] font-mono text-amber-400 shrink-0">★ {r.rating}</span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{r.description}</p>
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* Builder bottom sheet */}
      <Sheet open={showBuilder} onClose={() => setShowBuilder(false)} title="나만의 레시피 만들기">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">레시피 이름</label>
            <input
              value={builderName}
              onChange={(e) => setBuilderName(e.target.value)}
              placeholder="예: 나만의 라면 4분 30초"
              className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 placeholder-white/30"
            />
          </div>

          {/* Persona (sound & look) */}
          <div>
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">분위기 (사운드 · 비주얼)</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mt-1.5 pb-1">
              {DEFAULT_PERSONAS.map((p) => {
                const on = builderPersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setBuilderPersona(p.id); soundService.playPersonaSound(p.id); }}
                    className={`shrink-0 flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border text-xs font-mono transition ${
                      on ? "bg-white text-black border-white font-bold" : "bg-white/5 text-white/60 border-white/10"
                    }`}
                  >
                    <span className={`p-1 rounded-full ${on ? "bg-black/10" : "bg-white/5"}`}>
                      {getLucideIcon(p.icon, "w-3.5 h-3.5")}
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">단계</label>
              <span className="text-[10px] font-mono text-indigo-400">총 {fmtDur(builderTotalSeconds)}</span>
            </div>
            <div className="space-y-2.5">
              {builderSteps.map((s, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-mono font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <input
                      value={s.label}
                      onChange={(e) => updateStep(i, { label: e.target.value })}
                      placeholder="단계 이름 (예: 물 붓기)"
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-indigo-500 placeholder-white/30"
                    />
                    {builderSteps.length > 1 && (
                      <button
                        onClick={() => removeStep(i)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 active:text-rose-400 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    value={s.instruction}
                    onChange={(e) => updateStep(i, { instruction: e.target.value })}
                    placeholder="설명 (선택) — 이 단계에 무엇을 하나요?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-indigo-500 placeholder-white/30"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40">지속 시간</span>
                    <input
                      type="number"
                      min={1}
                      value={s.seconds}
                      onChange={(e) => updateStep(i, { seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-20 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-center outline-none focus:border-indigo-500 tabular-nums"
                    />
                    <span className="text-[10px] font-mono text-white/40">초 ({fmtDur(s.seconds)})</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="w-full mt-2.5 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/20 text-xs font-mono text-white/60 active:bg-white/10 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              단계 추가
            </button>
          </div>

          {/* Save */}
          <button
            onClick={saveCustomRecipe}
            disabled={!builderValid}
            className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition ${
              builderValid ? "bg-white text-black active:scale-[0.98]" : "bg-white/10 text-white/30"
            }`}
          >
            <Check className="w-4 h-4" />
            저장하고 시작하기
          </button>
          <p className="text-[10px] font-mono text-white/30 text-center leading-relaxed">
            각 단계가 끝나면 신호음이 울리고 다음 단계로 넘어갑니다.
            마지막 단계 뒤에는 '완성' 알림이 추가됩니다.
          </p>
        </div>
      </Sheet>

      {/* History bottom sheet */}
      <Sheet open={showHistory} onClose={() => setShowHistory(false)} title="기록">
        {sessions.length === 0 ? (
          <div className="py-12 text-center">
            <Layers className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/50">완료된 세션이 아직 없습니다.</p>
            <p className="text-[11px] text-white/30 mt-1">타이머를 완료(✓)하면 여기에 기록됩니다.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessions.length > 0 && (
              <button
                onClick={() => setSessions([])}
                className="w-full mb-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-white/50 active:text-rose-400"
              >
                전체 기록 삭제
              </button>
            )}
            {sessions.map((s) => (
              <div key={s.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                {editingId === s.id ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">제목</label>
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="무슨 시간이었나요? (예: 점심 컵라면)"
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider">메모</label>
                      <textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        rows={3}
                        placeholder="이 시간의 레시피는 어떤 내용이었나요? 느낀 점, 결과 등을 남겨보세요."
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs leading-relaxed outline-none focus:border-indigo-500 placeholder-white/30 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditSession}
                        className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-bold active:scale-[0.98]"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-white/5 rounded-lg text-indigo-400 shrink-0">
                          {getLucideIcon(
                            s.personaId === "coffee" ? "Coffee" : s.personaId === "cooking" ? "Flame" : s.personaId === "study" ? "Brain" : s.personaId === "workout" ? "Dumbbell" : s.personaId === "meditation" ? "Heart" : "Clock",
                            "w-3.5 h-3.5"
                          )}
                        </div>
                        <p className="text-sm font-bold truncate">{s.recipeName}</p>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 shrink-0 ml-2">
                        {formatTime(s.duration * 10, false)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-white/40 pl-8">
                      <span>{new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {s.milestonesReached > 0 && <span className="text-indigo-400">마일스톤 {s.milestonesReached}</span>}
                    </div>

                    {s.notes && (
                      <p className="text-xs text-white/70 leading-relaxed bg-white/5 rounded-lg p-2.5 mt-2 whitespace-pre-wrap">
                        {s.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 pl-8">
                      <button
                        onClick={() => startEditSession(s)}
                        className="text-[10px] font-mono text-white/50 flex items-center gap-1 active:text-indigo-400"
                      >
                        <Pencil className="w-3 h-3" /> {s.notes ? "편집" : "제목·메모 추가"}
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="text-[10px] font-mono text-white/40 flex items-center gap-1 active:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

// Reusable bottom sheet
function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 z-50 max-w-md mx-auto ${open ? "" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#1a212c] border-t border-white/10 rounded-t-3xl p-4 max-h-[80vh] flex flex-col transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 border border-white/10 active:scale-95">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="mx-auto w-10 h-1 bg-white/15 rounded-full mb-3 -mt-1 shrink-0" />
        <div className="overflow-y-auto no-scrollbar pb-4">{children}</div>
      </div>
    </div>
  );
}
