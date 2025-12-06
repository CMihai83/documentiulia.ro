"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Award,
  Crown,
  Zap,
  Target,
  Users,
  Calendar,
} from "lucide-react";

// Mock data for leaderboard
const leaderboardData = [
  { rank: 1, name: "Maria Popescu", xp: 12500, level: 10, levelName: "Titan", badges: 15, avatar: "MP", trend: "up" },
  { rank: 2, name: "Ion Marinescu", xp: 8200, level: 9, levelName: "Legendă", badges: 12, avatar: "IM", trend: "same" },
  { rank: 3, name: "Ana Constantinescu", xp: 6100, level: 7, levelName: "Maestru", badges: 10, avatar: "AC", trend: "up" },
  { rank: 4, name: "Mihai Dumitrescu", xp: 4500, level: 6, levelName: "Expert", badges: 8, avatar: "MD", trend: "down" },
  { rank: 5, name: "Elena Stoica", xp: 3200, level: 5, levelName: "Avansat", badges: 7, avatar: "ES", trend: "up" },
  { rank: 6, name: "Andrei Popa", xp: 2800, level: 5, levelName: "Avansat", badges: 6, avatar: "AP", trend: "same" },
  { rank: 7, name: "Cristina Radu", xp: 2100, level: 4, levelName: "Intermediar", badges: 5, avatar: "CR", trend: "up" },
  { rank: 8, name: "George Ionescu", xp: 1800, level: 4, levelName: "Intermediar", badges: 4, avatar: "GI", trend: "down" },
  { rank: 9, name: "Laura Gheorghe", xp: 1500, level: 3, levelName: "Ucenic", badges: 4, avatar: "LG", trend: "same" },
  { rank: 10, name: "Victor Marin", xp: 1200, level: 3, levelName: "Ucenic", badges: 3, avatar: "VM", trend: "up" },
];

const badges = [
  { id: "course_master", name: "Maestru Cursuri", icon: "📚", tier: "gold", earned: 45 },
  { id: "helpful_answer", name: "Mână de Ajutor", icon: "🤝", tier: "gold", earned: 38 },
  { id: "efactura_pro", name: "Pro e-Factura", icon: "📨", tier: "gold", earned: 52 },
  { id: "community_star", name: "Stea Comunității", icon: "⭐", tier: "gold", earned: 29 },
  { id: "first_course", name: "Primii Pași", icon: "🎓", tier: "bronze", earned: 234 },
  { id: "first_post", name: "Prima Voce", icon: "💬", tier: "bronze", earned: 189 },
];

type TimeFrame = "daily" | "weekly" | "monthly" | "alltime";

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<TimeFrame>("monthly");

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold">{rank}</span>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    return <span className="w-4 h-4 text-slate-400">—</span>;
  };

  const getLevelColor = (level: number) => {
    if (level >= 9) return "from-purple-500 to-pink-500";
    if (level >= 7) return "from-yellow-500 to-orange-500";
    if (level >= 5) return "from-blue-500 to-cyan-500";
    if (level >= 3) return "from-green-500 to-emerald-500";
    return "from-slate-400 to-slate-500";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-500" />
              Clasament Comunitate
            </h1>
            <p className="text-slate-600 mt-1">
              Top utilizatori din comunitatea DocumentIulia
            </p>
          </div>

          {/* Timeframe Filter */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {[
              { key: "daily", label: "Azi" },
              { key: "weekly", label: "Săptămânal" },
              { key: "monthly", label: "Lunar" },
              { key: "alltime", label: "Total" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeframe(item.key as TimeFrame)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  timeframe === item.key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4">
              {/* Second Place */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col items-center mt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2">
                  {leaderboardData[1].avatar}
                </div>
                <Medal className="w-8 h-8 text-slate-400 -mt-4 bg-white rounded-full p-1" />
                <h3 className="font-semibold text-slate-900 text-sm text-center mt-2">
                  {leaderboardData[1].name}
                </h3>
                <p className="text-xs text-slate-500">{leaderboardData[1].levelName}</p>
                <p className="text-lg font-bold text-slate-700 mt-1">
                  {leaderboardData[1].xp.toLocaleString()} XP
                </p>
              </div>

              {/* First Place */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 shadow-md border-2 border-yellow-200 flex flex-col items-center">
                <Crown className="w-8 h-8 text-yellow-500 mb-2" />
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2 ring-4 ring-yellow-200">
                  {leaderboardData[0].avatar}
                </div>
                <h3 className="font-bold text-slate-900 text-center">
                  {leaderboardData[0].name}
                </h3>
                <p className="text-sm text-amber-600 font-medium">{leaderboardData[0].levelName}</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {leaderboardData[0].xp.toLocaleString()} XP
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-600">{leaderboardData[0].badges} insigne</span>
                </div>
              </div>

              {/* Third Place */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col items-center mt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2">
                  {leaderboardData[2].avatar}
                </div>
                <Medal className="w-8 h-8 text-amber-600 -mt-4 bg-white rounded-full p-1" />
                <h3 className="font-semibold text-slate-900 text-sm text-center mt-2">
                  {leaderboardData[2].name}
                </h3>
                <p className="text-xs text-slate-500">{leaderboardData[2].levelName}</p>
                <p className="text-lg font-bold text-slate-700 mt-1">
                  {leaderboardData[2].xp.toLocaleString()} XP
                </p>
              </div>
            </div>

            {/* Rest of Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Clasament Complet
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {leaderboardData.slice(3).map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition"
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(user.rank)}
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getLevelColor(user.level)} flex items-center justify-center text-white font-semibold`}>
                      {user.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{user.name}</h3>
                      <p className="text-sm text-slate-500">
                        Nivel {user.level} • {user.levelName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {user.xp.toLocaleString()} XP
                      </p>
                      <p className="text-sm text-slate-500">{user.badges} insigne</p>
                    </div>
                    <div className="w-6">
                      {getTrendIcon(user.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Your Stats */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white">
              <h2 className="font-semibold text-blue-100 mb-4">Statisticile Tale</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  IP
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ion Popescu</h3>
                  <p className="text-blue-200">Nivel 5 • Avansat</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-blue-200 text-sm">
                    <Zap className="w-4 h-4" />
                    XP Total
                  </div>
                  <p className="text-2xl font-bold mt-1">1,250</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-blue-200 text-sm">
                    <Award className="w-4 h-4" />
                    Insigne
                  </div>
                  <p className="text-2xl font-bold mt-1">5</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-blue-200 mb-1">
                  <span>Progres nivel</span>
                  <span>750/1000 XP</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: "75%" }} />
                </div>
              </div>
              <p className="text-sm text-blue-200 mt-2">
                #42 în clasamentul lunar
              </p>
            </div>

            {/* Popular Badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Insigne Populare
              </h2>
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 text-sm">{badge.name}</h3>
                      <p className="text-xs text-slate-500">
                        {badge.earned} utilizatori
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      badge.tier === "gold"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {badge.tier === "gold" ? "Aur" : "Bronz"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Activitate Recentă
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div>
                    <p className="text-slate-900">Maria P. a primit insigna "Maestru Cursuri"</p>
                    <p className="text-slate-500 text-xs">acum 5 minute</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <p className="text-slate-900">Ion M. a avansat la Nivel 9</p>
                    <p className="text-slate-500 text-xs">acum 2 ore</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                  <div>
                    <p className="text-slate-900">Ana C. a finalizat cursul "SAF-T Practic"</p>
                    <p className="text-slate-500 text-xs">acum 4 ore</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
