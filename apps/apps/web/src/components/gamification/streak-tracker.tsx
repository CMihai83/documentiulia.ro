"use client";

import { Flame, Calendar, Trophy, Target, CheckCircle, Circle } from "lucide-react";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  weekActivity: boolean[]; // Last 7 days, most recent last
}

interface StreakTrackerProps {
  streak: StreakData;
  variant?: "compact" | "full";
}

export function StreakTracker({ streak, variant = "compact" }: StreakTrackerProps) {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const isActiveToday = streak.weekActivity[streak.weekActivity.length - 1];

  const getFlameColor = (streakCount: number) => {
    if (streakCount >= 30) return "text-purple-500";
    if (streakCount >= 14) return "text-orange-500";
    if (streakCount >= 7) return "text-amber-500";
    if (streakCount >= 3) return "text-yellow-500";
    return "text-slate-400";
  };

  const getFlameIntensity = (streakCount: number) => {
    if (streakCount >= 30) return "animate-pulse";
    if (streakCount >= 7) return "";
    return "";
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
            isActiveToday ? "bg-orange-100" : "bg-slate-100"
          }`}
        >
          <Flame
            className={`w-5 h-5 ${getFlameColor(streak.currentStreak)} ${getFlameIntensity(
              streak.currentStreak
            )}`}
          />
          <span
            className={`font-bold ${isActiveToday ? "text-orange-600" : "text-slate-600"}`}
          >
            {streak.currentStreak}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Flame className={`w-5 h-5 ${getFlameColor(streak.currentStreak)}`} />
          Seria Ta de Activitate
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-slate-500">Curentă</p>
            <p className="text-xl font-bold text-orange-600">{streak.currentStreak}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500">Record</p>
            <p className="text-xl font-bold text-purple-600">{streak.longestStreak}</p>
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="flex items-center justify-between gap-2">
        {streak.weekActivity.map((active, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                active
                  ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {active ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>
            <span className="text-xs text-slate-500">{days[index]}</span>
          </div>
        ))}
      </div>

      {/* Motivation message */}
      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            {streak.currentStreak === 0 ? (
              <p className="text-sm text-amber-700">
                Începe o serie nouă astăzi! Învață ceva nou și câștigă XP bonus.
              </p>
            ) : streak.currentStreak < 7 ? (
              <p className="text-sm text-amber-700">
                Ai <span className="font-bold">{streak.currentStreak}</span> zile consecutive!
                Continuă până la 7 pentru bonus dublu de XP!
              </p>
            ) : streak.currentStreak < 30 ? (
              <p className="text-sm text-amber-700">
                Impresionant! <span className="font-bold">{streak.currentStreak}</span> zile!
                La 30 de zile primești insigna {"\"Dedicat\""}.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                Ești un <span className="font-bold">Campion</span> cu{" "}
                <span className="font-bold">{streak.currentStreak}</span> zile! Continuă să inspiri
                comunitatea!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Streak milestones */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { days: 3, reward: "+10 XP", icon: "3" },
          { days: 7, reward: "+25 XP", icon: "7" },
          { days: 14, reward: "+50 XP", icon: "14" },
          { days: 30, reward: "Badge", icon: "30" },
        ].map((milestone) => (
          <div
            key={milestone.days}
            className={`text-center p-2 rounded-lg ${
              streak.currentStreak >= milestone.days
                ? "bg-green-100 border border-green-200"
                : "bg-slate-50 border border-slate-200"
            }`}
          >
            <p
              className={`text-lg font-bold ${
                streak.currentStreak >= milestone.days ? "text-green-600" : "text-slate-400"
              }`}
            >
              {milestone.icon}
            </p>
            <p className="text-xs text-slate-500">{milestone.reward}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivityCalendarProps {
  activities: { date: string; count: number }[];
  month?: Date;
}

export function ActivityCalendar({ activities, month = new Date() }: ActivityCalendarProps) {
  const activityMap = new Map(activities.map((a) => [a.date, a.count]));

  const getActivityLevel = (count: number) => {
    if (count >= 5) return "bg-green-600";
    if (count >= 3) return "bg-green-400";
    if (count >= 1) return "bg-green-200";
    return "bg-slate-100";
  };

  // Generate calendar grid for the month
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1; // Monday = 0
  const daysInMonth = endOfMonth.getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startDay).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const monthNames = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Calendar Activitate
        </h3>
        <span className="text-sm text-slate-500">
          {monthNames[month.getMonth()]} {month.getFullYear()}
        </span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
          <div key={i} className="text-center text-xs text-slate-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <div key={dayIndex} className="w-8 h-8" />;
              }
              const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const count = activityMap.get(dateStr) || 0;
              return (
                <div
                  key={dayIndex}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs ${getActivityLevel(
                    count
                  )} ${count > 0 ? "text-white font-medium" : "text-slate-400"}`}
                  title={`${dateStr}: ${count} activități`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
        <span>Mai puțin</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-slate-100 rounded" />
          <div className="w-3 h-3 bg-green-200 rounded" />
          <div className="w-3 h-3 bg-green-400 rounded" />
          <div className="w-3 h-3 bg-green-600 rounded" />
        </div>
        <span>Mai mult</span>
      </div>
    </div>
  );
}
