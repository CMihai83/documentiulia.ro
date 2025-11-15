import React, { useState, useEffect } from 'react';
import { Search, BookOpen, TrendingUp, Filter, Star, CheckCircle, Clock } from 'lucide-react';

interface MBABook {
  id: number;
  book_number: number;
  title: string;
  author: string;
  category: string;
  core_concept: string;
  key_frameworks?: string[];
}

interface Category {
  category: string;
  book_count: number;
  books: MBABook[];
}

interface UserProgress {
  book_id: number;
  status: 'not_started' | 'reading' | 'completed';
  rating?: number;
}

const MBALibrary: React.FC = () => {
  const [books, setBooks] = useState<MBABook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Record<number, UserProgress>>({});
  const [view, setView] = useState<'grid' | 'categories'>('categories');

  useEffect(() => {
    loadCategories();
    loadUserProgress();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/v1/mba/library?action=categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load MBA library:', error);
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    try {
      const response = await fetch(`/api/v1/mba/progress?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        const progressMap: Record<number, UserProgress> = {};
        data.progress.forEach((p: UserProgress) => {
          progressMap[p.book_id] = p;
        });
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const searchBooks = async (query: string) => {
    if (!query.trim()) {
      loadCategories();
      return;
    }

    try {
      const response = await fetch(`/api/v1/mba/library?search=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success) {
        setBooks(data.results);
        setView('grid');
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const updateBookStatus = async (bookId: number, status: string, rating?: number) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    try {
      const response = await fetch('/api/v1/mba/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, book_id: bookId, status, rating })
      });

      if (response.ok) {
        setUserProgress(prev => ({
          ...prev,
          [bookId]: { book_id: bookId, status: status as any, rating }
        }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusIcon = (bookId: number) => {
    const progress = userProgress[bookId];
    if (!progress) return <BookOpen className="w-5 h-5 text-gray-400" />;

    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reading':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Foundation': 'bg-purple-100 text-purple-800',
      'Business Creation': 'bg-blue-100 text-blue-800',
      'Marketing': 'bg-green-100 text-green-800',
      'Sales': 'bg-yellow-100 text-yellow-800',
      'Finance': 'bg-red-100 text-red-800',
      'Psychology': 'bg-indigo-100 text-indigo-800',
      'Productivity': 'bg-orange-100 text-orange-800',
      'Leadership': 'bg-pink-100 text-pink-800',
      'Management': 'bg-teal-100 text-teal-800',
      'Strategy': 'bg-cyan-100 text-cyan-800',
      'Innovation': 'bg-lime-100 text-lime-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Personal MBA Library</h1>
        </div>
        <p className="text-gray-600 text-lg">
          99 essential business books curated by Josh Kaufman - Your complete business education
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search books by title, author, or concept..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchBooks(e.target.value);
            }}
          />
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('categories')}
          className={`px-4 py-2 rounded-lg ${
            view === 'categories'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4 inline mr-2" />
          By Category
        </button>
        <button
          onClick={() => setView('grid')}
          className={`px-4 py-2 rounded-lg ${
            view === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          All Books
        </button>
      </div>

      {/* Categories View */}
      {view === 'categories' && (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.category} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
                <span className="text-sm text-gray-500">{category.book_count} books</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    progress={userProgress[book.id]}
                    onStatusChange={updateBookStatus}
                    getCategoryColor={getCategoryColor}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              progress={userProgress[book.id]}
              onStatusChange={updateBookStatus}
              getCategoryColor={getCategoryColor}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface BookCardProps {
  book: MBABook;
  progress?: UserProgress;
  onStatusChange: (bookId: number, status: string, rating?: number) => void;
  getCategoryColor: (category: string) => string;
  getStatusIcon: (bookId: number) => React.ReactNode;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  progress,
  onStatusChange,
  getCategoryColor,
  getStatusIcon
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Book Number Badge */}
      <div className="flex items-start justify-between mb-3">
        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
          #{book.book_number}
        </span>
        {getStatusIcon(book.id)}
      </div>

      {/* Book Title */}
      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{book.title}</h3>

      {/* Author */}
      <p className="text-sm text-gray-600 mb-2">{book.author}</p>

      {/* Category */}
      <span className={`inline-block text-xs px-2 py-1 rounded ${getCategoryColor(book.category)} mb-3`}>
        {book.category}
      </span>

      {/* Core Concept */}
      <p className="text-sm text-gray-700 line-clamp-3 mb-3">{book.core_concept}</p>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onStatusChange(book.id, 'reading')}
            className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Reading
          </button>
          <button
            onClick={() => onStatusChange(book.id, 'completed')}
            className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark Done
          </button>
        </div>
      )}

      {/* Rating */}
      {progress?.status === 'completed' && (
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 cursor-pointer ${
                progress.rating && star <= progress.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
              onClick={() => onStatusChange(book.id, 'completed', star)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MBALibrary;
