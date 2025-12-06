"use client";

import { Zap, TrendingUp, Sparkles, Star } from "lucide-react";

interface Level {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  perks: string[];
}

const levels: Level[] = [
  { level: 1, name: "Novice", minXp: 0, maxXp: 100, color: "from-slate-400 to-slate-500", perks: ["Acces la cursuri de bază"] },
  { level: 2, name: "Începător", minXp: 100, maxXp: 300, color: "from-green-400 to-green-600", perks: ["Acces la forum"] },
  { level: 3, name: "Ucenic", minXp: 300, maxXp: 600, color: "from-emerald-400 to-emerald-600", perks: ["Participare la webinarii"] },
  { level: 4, name: "Intermediar", minXp: 600, maxXp: 1000, color: "from-cyan-400 to-cyan-600", perks: ["Răspunsuri prioritare"] },
  { level: 5, name: "Avansat", minXp: 1000, maxXp: 1500, color: "from-blue-400 to-blue-600", perks: ["Discount 5% la cursuri"] },
  { level: 6, name: "Expert", minXp: 1500, maxXp: 2500, color: "from-indigo-400 to-indigo-600", perks: ["Discount 10% la cursuri"] },
  { level: 7, name: "Maestru", minXp: 2500, maxXp: 4000, color: "from-violet-400 to-violet-600", perks: ["Badge exclusiv", "Menționare pe site"] },
  { level: 8, name: "Specialist", minXp: 4000, maxXp: 6000, color: "from-purple-400 to-purple-600", perks: ["Consultanță gratuită 30min"] },
  { level: 9, name: "Legendă", minXp: 6000, maxXp: 9000, color: "from-pink-400 to-pink-600", perks: ["Acces beta la funcții noi"] },
  { level: 10, name: "Titan", minXp: 9000, maxXp: Infinity, color: "from-yellow-400 to-amber-500", perks: ["Statut VIP", "Toate beneficiile"] },
];

function getCurrentLevel(xp: number): Level {
  return levels.find((l) => xp >= l.minXp && xp < l.maxXp) || levels[levels.length - 1];
}

function getNextLevel(currentLevel: number): Level | null {
  return levels[currentLevel] || null;
}

interface XpProgressBarProps {
  currentXp: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export function XpProgressBar({
  currentXp,
  size = "md",
  showLabel = true,
  animated = true,
}: XpProgressBarProps) {
  const currentLevel = getCurrentLevel(currentXp);
  const nextLevel = getNextLevel(currentLevel.level);

  const progressInLevel = currentXp - currentLevel.minXp;
  const xpNeededForLevel = (nextLevel?.minXp || currentLevel.maxXp) - currentLevel.minXp;
  const progressPercent = Math.min((progressInLevel / xpNeededForLevel) * 100, 100);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-slate-700">
            Nivel {currentLevel.level} - {currentLevel.name}
          </span>
          <span className="text-slate-500">
            {currentXp.toLocaleString()} / {nextLevel ? nextLevel.minXp.toLocaleString() : "MAX"} XP
          </span>
        </div>
      )}
      <div className={`${heights[size]} bg-slate-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full bg-gradient-to-r ${currentLevel.color} rounded-full ${
            animated ? "transition-all duration-500 ease-out" : ""
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {nextLevel && showLabel && (
        <p className="text-xs text-slate-500 mt-1">
          {(nextLevel.minXp - currentXp).toLocaleString()} XP până la Nivel {nextLevel.level}
        </p>
      )}
    </div>
  );
}

interface XpBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
}

export function XpBadge({ xp, size = "md" }: XpBadgeProps) {
  const level = getCurrentLevel(xp);

  const sizes = {
    sm: { container: "px-2 py-0.5", icon: "w-3 h-3", text: "text-xs" },
    md: { container: "px-3 py-1", icon: "w-4 h-4", text: "text-sm" },
    lg: { container: "px-4 py-1.5", icon: "w-5 h-5", text: "text-base" },
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${level.color} text-white rounded-full ${sizes[size].container}`}
    >
      <Zap className={sizes[size].icon} />
      <span className={`${sizes[size].text} font-bold`}>{xp.toLocaleString()}</span>
    </div>
  );
}

interface LevelCardProps {
  level: Level;
  isCurrentLevel?: boolean;
  isUnlocked?: boolean;
}

export function LevelCard({ level, isCurrentLevel = false, isUnlocked = false }: LevelCardProps) {
  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition ${
        isCurrentLevel
          ? `bg-gradient-to-br ${level.color} text-white border-transparent shadow-lg`
          : isUnlocked
          ? "bg-white border-slate-200 hover:border-slate-300"
          : "bg-slate-50 border-slate-200 opacity-60"
      }`}
    >
      {isCurrentLevel && (
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-6 h-6 text-yellow-300" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isCurrentLevel
              ? "bg-white/20"
              : isUnlocked
              ? `bg-gradient-to-br ${level.color}`
              : "bg-slate-200"
          }`}
        >
          {isCurrentLevel ? (
            <Star className="w-6 h-6" />
          ) : isUnlocked ? (
            <span className="text-white font-bold text-lg">{level.level}</span>
          ) : (
            <span className="text-slate-400 font-bold text-lg">{level.level}</span>
          )}
        </div>
        <div>
          <h3
            className={`font-bold ${
              isCurrentLevel ? "text-white" : isUnlocked ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {level.name}
          </h3>
          <p
            className={`text-sm ${
              isCurrentLevel ? "text-white/80" : isUnlocked ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {level.minXp.toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Perks */}
      <div className="mt-3 space-y-1">
        {level.perks.map((perk, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-sm ${
              isCurrentLevel ? "text-white/90" : isUnlocked ? "text-slate-600" : "text-slate-400"
            }`}
          >
            <span className={isCurrentLevel ? "text-yellow-300" : "text-green-500"}>+</span>
            {perk}
          </div>
        ))}
      </div>
    </div>
  );
}

interface LevelProgressionProps {
  currentXp: number;
}

export function LevelProgression({ currentXp }: LevelProgressionProps) {
  const currentLevel = getCurrentLevel(currentXp);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Progresie Niveluri
        </h3>
        <XpBadge xp={currentXp} />
      </div>

      <XpProgressBar currentXp={currentXp} size="lg" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {levels.slice(0, 10).map((level) => (
          <LevelCard
            key={level.level}
            level={level}
            isCurrentLevel={level.level === currentLevel.level}
            isUnlocked={currentXp >= level.minXp}
          />
        ))}
      </div>
    </div>
  );
}

interface XpGainAnimationProps {
  amount: number;
  reason: string;
  onComplete?: () => void;
}

export function XpGainAnimation({ amount, reason, onComplete }: XpGainAnimationProps) {
  return (
    <div
      className="fixed top-20 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-4 rounded-xl shadow-lg animate-bounce z-50"
      onAnimationEnd={onComplete}
    >
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8" />
        <div>
          <p className="text-2xl font-bold">+{amount} XP</p>
          <p className="text-sm text-white/90">{reason}</p>
        </div>
      </div>
    </div>
  );
}

export { levels, getCurrentLevel, getNextLevel };
