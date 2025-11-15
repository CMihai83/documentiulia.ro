import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Target, Award, BarChart3 } from 'lucide-react';

interface ProgressStats {
  total_books: number;
  completed: number;
  reading: number;
  not_started: number;
  completion_percentage: number;
}

interface BookProgress {
  book_id: number;
  title: string;
  author: string;
  category: string;
  status: 'not_started' | 'reading' | 'completed';
  rating?: number;
  started_at?: string;
  completed_at?: string;
}

const MBAProgressDashboard: React.FC = () => {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [progress, setProgress] = useState<BookProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reading' | 'completed'>('all');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/mba/progress?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.statistics);
        setProgress(data.progress);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load progress:', error);
      setLoading(false);
    }
  };

  const filteredProgress = progress.filter((book) => {
    if (filter === 'all') return true;
    return book.status === filter;
  });

  const getCategoryStats = () => {
    const categoryMap: Record<string, number> = {};
    progress.forEach((book) => {
      if (book.status === 'completed') {
        categoryMap[book.category] = (categoryMap[book.category] || 0) + 1;
      }
    });
    return Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getStreak = () => {
    const completedBooks = progress
      .filter((b) => b.status === 'completed' && b.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

    if (completedBooks.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < completedBooks.length; i++) {
      const current = new Date(completedBooks[i].completed_at!);
      const previous = new Date(completedBooks[i - 1].completed_at!);
      const diffDays = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Loghează-te pentru a urmări progresul tău în Personal MBA</p>
        </div>
      </div>
    );
  }

  const categoryStats = getCategoryStats();
  const streak = getStreak();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progresul Tău MBA</h1>
        <p className="text-gray-600">Parcursul tău prin cele 99 de cărți de business esențiale</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Completion Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">
              {stats.completion_percentage}%
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Progres Total</h3>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${stats.completion_percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Books Completed */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Cărți Finalizate</h3>
          <p className="text-xs text-gray-500 mt-1">din {stats.total_books} total</p>
        </div>

        {/* Currently Reading */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-orange-600">{stats.reading}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">În Curs de Citire</h3>
          <p className="text-xs text-gray-500 mt-1">cărți active</p>
        </div>

        {/* Reading Streak */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">{streak}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Streak Săptămânal</h3>
          <p className="text-xs text-gray-500 mt-1">cărți consecutive</p>
        </div>
      </div>

      {/* Category Mastery */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Categorii Stăpânite</h2>
          </div>
          <div className="space-y-3">
            {categoryStats.map(([category, count]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{category}</span>
                  <span className="text-gray-600">{count} cărți</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(count / 15) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Toate ({progress.length})
        </button>
        <button
          onClick={() => setFilter('reading')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'reading'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          În Curs ({stats.reading})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Finalizate ({stats.completed})
        </button>
      </div>

      {/* Books List */}
      <div className="space-y-4">
        {filteredProgress.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Începe să citești din Personal MBA Library pentru a-ți urmări progresul'
                : `Nicio carte ${filter === 'reading' ? 'în curs de citire' : 'finalizată'} încă`}
            </p>
          </div>
        ) : (
          filteredProgress.map((book) => (
            <div
              key={book.book_id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{book.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {book.category}
                    </span>
                    {book.status === 'completed' && book.completed_at && (
                      <span className="text-xs text-gray-500">
                        Finalizat: {new Date(book.completed_at).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                    {book.status === 'reading' && book.started_at && (
                      <span className="text-xs text-gray-500">
                        Început: {new Date(book.started_at).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col items-end gap-2">
                  {book.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      {book.rating && (
                        <div className="flex gap-1">
                          {[...Array(book.rating)].map((_, i) => (
                            <span key={i} className="text-yellow-400">★</span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <BookOpen className="w-6 h-6 text-orange-500" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MBAProgressDashboard;
