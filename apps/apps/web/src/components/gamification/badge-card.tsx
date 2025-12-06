"use client";

import { Award, Lock, CheckCircle2 } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: string;
  xpReward: number;
  requirement: string;
  earned?: boolean;
  earnedAt?: string;
  progress?: number;
}

interface BadgeCardProps {
  badge: Badge;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  onClick?: () => void;
}

const tierColors = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-600 to-amber-800",
    border: "border-amber-500",
    ring: "ring-amber-300",
    text: "text-amber-700",
    lightBg: "bg-amber-50",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-300 to-slate-500",
    border: "border-slate-400",
    ring: "ring-slate-300",
    text: "text-slate-700",
    lightBg: "bg-slate-50",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
    border: "border-yellow-400",
    ring: "ring-yellow-300",
    text: "text-yellow-700",
    lightBg: "bg-yellow-50",
  },
  platinum: {
    bg: "bg-gradient-to-br from-purple-400 to-indigo-600",
    border: "border-purple-400",
    ring: "ring-purple-300",
    text: "text-purple-700",
    lightBg: "bg-purple-50",
  },
};

const sizeClasses = {
  sm: {
    container: "w-16",
    icon: "w-10 h-10 text-2xl",
    text: "text-xs",
  },
  md: {
    container: "w-24",
    icon: "w-14 h-14 text-3xl",
    text: "text-sm",
  },
  lg: {
    container: "w-32",
    icon: "w-20 h-20 text-4xl",
    text: "text-base",
  },
};

export function BadgeCard({ badge, size = "md", showProgress = false, onClick }: BadgeCardProps) {
  const colors = tierColors[badge.tier];
  const sizes = sizeClasses[size];
  const isEarned = badge.earned;

  return (
    <div
      className={`relative flex flex-col items-center ${sizes.container} cursor-pointer transition-transform hover:scale-105`}
      onClick={onClick}
    >
      {/* Badge Icon */}
      <div
        className={`relative ${sizes.icon} rounded-full flex items-center justify-center ${
          isEarned
            ? `${colors.bg} ring-2 ${colors.ring} shadow-lg`
            : "bg-slate-200 ring-2 ring-slate-300"
        }`}
      >
        {isEarned ? (
          <span className="filter drop-shadow-sm">{badge.icon}</span>
        ) : (
          <Lock className="w-5 h-5 text-slate-400" />
        )}

        {/* Earned checkmark */}
        {isEarned && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Badge Name */}
      <p
        className={`mt-2 ${sizes.text} font-medium text-center ${
          isEarned ? "text-slate-900" : "text-slate-400"
        }`}
      >
        {badge.name}
      </p>

      {/* Progress bar */}
      {showProgress && !isEarned && badge.progress !== undefined && (
        <div className="w-full mt-1">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bg} rounded-full transition-all`}
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">
            {badge.progress}%
          </p>
        </div>
      )}

      {/* XP Reward tooltip */}
      {isEarned && (
        <span className={`${sizes.text} ${colors.text} font-medium`}>
          +{badge.xpReward} XP
        </span>
      )}
    </div>
  );
}

interface BadgeGridProps {
  badges: Badge[];
  columns?: 3 | 4 | 5 | 6;
  showProgress?: boolean;
  onBadgeClick?: (badge: Badge) => void;
}

export function BadgeGrid({
  badges,
  columns = 5,
  showProgress = false,
  onBadgeClick,
}: BadgeGridProps) {
  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {badges.map((badge) => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          size="md"
          showProgress={showProgress}
          onClick={() => onBadgeClick?.(badge)}
        />
      ))}
    </div>
  );
}

interface BadgeDetailModalProps {
  badge: Badge | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, isOpen, onClose }: BadgeDetailModalProps) {
  if (!isOpen || !badge) return null;

  const colors = tierColors[badge.tier];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Large badge icon */}
          <div
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl ${
              badge.earned ? colors.bg : "bg-slate-200"
            } ring-4 ${badge.earned ? colors.ring : "ring-slate-300"} shadow-lg`}
          >
            {badge.earned ? badge.icon : <Lock className="w-10 h-10 text-slate-400" />}
          </div>

          {/* Badge info */}
          <h3 className="text-xl font-bold text-slate-900 mt-4">{badge.name}</h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${colors.lightBg} ${colors.text}`}
          >
            {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}
          </span>

          <p className="text-slate-600 mt-3">{badge.description}</p>

          {/* Requirement */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500">Cerință</p>
            <p className="text-sm font-medium text-slate-700">{badge.requirement}</p>
          </div>

          {/* Status */}
          {badge.earned ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                Obținut pe {new Date(badge.earnedAt!).toLocaleDateString("ro-RO")}
              </span>
            </div>
          ) : badge.progress !== undefined ? (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>Progres</span>
                <span>{badge.progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bg} rounded-full`}
                  style={{ width: `${badge.progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* XP Reward */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Award className={`w-5 h-5 ${colors.text}`} />
            <span className="font-bold text-slate-900">+{badge.xpReward} XP</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
        >
          Închide
        </button>
      </div>
    </div>
  );
}
