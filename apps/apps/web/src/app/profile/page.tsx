"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  User,
  Mail,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Award,
  Zap,
  Trophy,
  Star,
  Target,
  Flame,
  BookOpen,
  MessageCircle,
  FileText,
  TrendingUp,
  Settings,
  Edit2,
  CheckCircle2,
  Lock,
} from "lucide-react";

// Mock user data
const userData = {
  name: "Ion Popescu",
  email: "ion.popescu@example.com",
  avatar: "IP",
  company: "SC Exemplu SRL",
  cui: "RO12345678",
  role: "Administrator",
  location: "București, România",
  phone: "+40 721 234 567",
  joinedAt: "2024-01-15",
  // Gamification data
  xp: 3250,
  level: 6,
  levelName: "Expert",
  nextLevelXp: 4000,
  streak: 12,
  longestStreak: 18,
  coursesCompleted: 8,
  postsCount: 24,
  helpfulAnswers: 15,
  invoicesCreated: 156,
  badgesEarned: 9,
  rank: 42,
};

const earnedBadges = [
  { id: "1", name: "Primii Pași", icon: "🎓", tier: "bronze", earnedAt: "2024-01-20" },
  { id: "2", name: "Prima Voce", icon: "💬", tier: "bronze", earnedAt: "2024-01-25" },
  { id: "3", name: "Maestru Cursuri", icon: "📚", tier: "gold", earnedAt: "2024-03-10" },
  { id: "4", name: "Pro e-Factura", icon: "📨", tier: "gold", earnedAt: "2024-04-05" },
  { id: "5", name: "Mână de Ajutor", icon: "🤝", tier: "silver", earnedAt: "2024-05-15" },
  { id: "6", name: "Contabil Activ", icon: "📊", tier: "silver", earnedAt: "2024-06-01" },
  { id: "7", name: "Săptămână Perfectă", icon: "🔥", tier: "bronze", earnedAt: "2024-06-20" },
  { id: "8", name: "Lună Completă", icon: "📅", tier: "silver", earnedAt: "2024-07-01" },
  { id: "9", name: "Stea Comunității", icon: "⭐", tier: "gold", earnedAt: "2024-08-10" },
];

const recentActivity = [
  { type: "course", text: "Ai finalizat cursul \"SAF-T Practic\"", xp: 150, date: "acum 2 ore" },
  { type: "badge", text: "Ai primit insigna \"Stea Comunității\"", xp: 100, date: "acum 1 zi" },
  { type: "post", text: "Ai răspuns la o întrebare în forum", xp: 15, date: "acum 2 zile" },
  { type: "invoice", text: "Ai creat 10 facturi noi", xp: 50, date: "acum 3 zile" },
  { type: "streak", text: "Ai menținut seria de 10 zile", xp: 25, date: "acum 4 zile" },
];

const tierColors = {
  bronze: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-700 border-slate-200",
  gold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  platinum: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "badges" | "activity">("overview");

  const progressPercent = ((userData.xp - 2500) / (userData.nextLevelXp - 2500)) * 100;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold ring-4 ring-white/30">
                {userData.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-sm ring-2 ring-white">
                {userData.level}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{userData.name}</h1>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {userData.levelName}
                </span>
              </div>
              <p className="text-blue-100 mt-1">{userData.company}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-100">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {userData.email}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {userData.location}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition">
                <Edit2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mt-6 relative">
            <div className="flex justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                {userData.xp.toLocaleString()} XP
              </span>
              <span className="text-blue-200">
                {userData.nextLevelXp.toLocaleString()} XP pentru Nivel {userData.level + 1}
              </span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{userData.streak}</p>
                <p className="text-sm text-slate-500">Zile serie</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{userData.badgesEarned}</p>
                <p className="text-sm text-slate-500">Insigne</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{userData.coursesCompleted}</p>
                <p className="text-sm text-slate-500">Cursuri</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">#{userData.rank}</p>
                <p className="text-sm text-slate-500">Clasament</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {[
            { key: "overview", label: "Prezentare", icon: User },
            { key: "badges", label: "Insigne", icon: Award },
            { key: "activity", label: "Activitate", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Account Details */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Detalii Cont
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Nume complet</p>
                  <p className="font-medium text-slate-900">{userData.name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Email</p>
                  <p className="font-medium text-slate-900">{userData.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Companie</p>
                  <p className="font-medium text-slate-900">{userData.company}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">CUI</p>
                  <p className="font-medium text-slate-900">{userData.cui}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Telefon</p>
                  <p className="font-medium text-slate-900">{userData.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">Membru din</p>
                  <p className="font-medium text-slate-900">
                    {new Date(userData.joinedAt).toLocaleDateString("ro-RO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Achievements Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Realizări
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Facturi create</span>
                  <span className="font-bold text-slate-900">{userData.invoicesCreated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Postări forum</span>
                  <span className="font-bold text-slate-900">{userData.postsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Răspunsuri utile</span>
                  <span className="font-bold text-slate-900">{userData.helpfulAnswers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Serie maximă</span>
                  <span className="font-bold text-slate-900">{userData.longestStreak} zile</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "badges" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Insigne Obținute ({earnedBadges.length})
              </h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-4 rounded-xl border ${tierColors[badge.tier as keyof typeof tierColors]} cursor-pointer hover:scale-105 transition`}
                >
                  <span className="text-3xl mb-2">{badge.icon}</span>
                  <p className="text-sm font-medium text-center">{badge.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(badge.earnedAt).toLocaleDateString("ro-RO")}
                  </p>
                </div>
              ))}
              {/* Locked badges placeholder */}
              {[1, 2, 3].map((i) => (
                <div
                  key={`locked-${i}`}
                  className="flex flex-col items-center p-4 rounded-xl border border-slate-200 bg-slate-50 opacity-50"
                >
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-400 text-center">???</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Activitate Recentă
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === "course" ? "bg-green-100" :
                    activity.type === "badge" ? "bg-purple-100" :
                    activity.type === "post" ? "bg-blue-100" :
                    activity.type === "invoice" ? "bg-amber-100" :
                    "bg-orange-100"
                  }`}>
                    {activity.type === "course" && <BookOpen className="w-5 h-5 text-green-600" />}
                    {activity.type === "badge" && <Award className="w-5 h-5 text-purple-600" />}
                    {activity.type === "post" && <MessageCircle className="w-5 h-5 text-blue-600" />}
                    {activity.type === "invoice" && <FileText className="w-5 h-5 text-amber-600" />}
                    {activity.type === "streak" && <Flame className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900">{activity.text}</p>
                    <p className="text-sm text-slate-500">{activity.date}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600 font-medium">
                    <Zap className="w-4 h-4" />
                    +{activity.xp} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
