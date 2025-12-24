export default function TutorialsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-200 rounded mt-2" />
        </div>
        <div className="h-6 w-32 bg-gray-200 rounded" />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-white rounded-xl border-2 border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-5 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded mt-2" />
                <div className="h-3 w-20 bg-gray-200 rounded mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tutorial List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="h-6 w-40 bg-gray-200 rounded" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-32 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded mt-2" />
                <div className="flex gap-3 mt-2">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
