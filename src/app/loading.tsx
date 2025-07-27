export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header skeleton */}
        <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg skeleton"></div>
                <div className="w-48 h-6 bg-white/20 rounded skeleton"></div>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <div className="w-16 h-4 bg-white/20 rounded skeleton"></div>
                <div className="w-20 h-4 bg-white/20 rounded skeleton"></div>
                <div className="w-16 h-4 bg-white/20 rounded skeleton"></div>
                <div className="w-12 h-4 bg-white/20 rounded skeleton"></div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Dashboard skeleton */}
          <section className="mb-12">
            <div className="text-center mb-8">
              <div className="w-64 h-8 bg-white/20 rounded mx-auto mb-4 skeleton"></div>
              <div className="w-96 h-4 bg-white/20 rounded mx-auto skeleton"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="glass-dark rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full skeleton"></div>
                    <div className="w-16 h-8 bg-white/20 rounded skeleton"></div>
                  </div>
                  <div className="w-32 h-6 bg-white/20 rounded mb-2 skeleton"></div>
                  <div className="w-24 h-4 bg-white/20 rounded skeleton"></div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured Story skeleton */}
          <section className="mb-12">
            <div className="w-32 h-6 bg-white/20 rounded mb-6 skeleton"></div>
            <div className="glass-dark rounded-xl p-8 border border-white/10">
              <div className="md:flex">
                <div className="md:w-1/3 bg-white/10 p-8 flex items-center justify-center rounded-lg">
                  <div className="w-24 h-16 bg-white/20 rounded skeleton"></div>
                </div>
                <div className="md:w-2/3 p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-20 h-6 bg-white/20 rounded-full skeleton"></div>
                    <div className="w-16 h-4 bg-white/20 rounded skeleton"></div>
                  </div>
                  <div className="w-full h-8 bg-white/20 rounded mb-4 skeleton"></div>
                  <div className="w-3/4 h-8 bg-white/20 rounded mb-4 skeleton"></div>
                  <div className="w-full h-4 bg-white/20 rounded mb-2 skeleton"></div>
                  <div className="w-full h-4 bg-white/20 rounded mb-2 skeleton"></div>
                  <div className="w-2/3 h-4 bg-white/20 rounded mb-6 skeleton"></div>
                  <div className="flex justify-between">
                    <div className="w-32 h-4 bg-white/20 rounded skeleton"></div>
                    <div className="w-24 h-8 bg-white/20 rounded skeleton"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stories grid skeleton */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <div className="w-48 h-6 bg-white/20 rounded skeleton"></div>
              <div className="w-32 h-4 bg-white/20 rounded skeleton"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="glass-dark rounded-xl border border-white/10 overflow-hidden">
                  <div className="h-48 bg-white/10 skeleton"></div>
                  <div className="p-6">
                    <div className="flex justify-between mb-3">
                      <div className="w-16 h-6 bg-white/20 rounded-full skeleton"></div>
                      <div className="w-12 h-4 bg-white/20 rounded skeleton"></div>
                    </div>
                    <div className="w-full h-6 bg-white/20 rounded mb-2 skeleton"></div>
                    <div className="w-3/4 h-6 bg-white/20 rounded mb-3 skeleton"></div>
                    <div className="w-full h-4 bg-white/20 rounded mb-1 skeleton"></div>
                    <div className="w-full h-4 bg-white/20 rounded mb-1 skeleton"></div>
                    <div className="w-2/3 h-4 bg-white/20 rounded mb-4 skeleton"></div>
                    <div className="flex justify-between">
                      <div className="w-32 h-4 bg-white/20 rounded skeleton"></div>
                      <div className="w-20 h-4 bg-white/20 rounded skeleton"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}