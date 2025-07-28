import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import { mockRecentStories } from '@/lib/mock-data'
import StoryCard from '@/components/StoryCard'
import StoryFilters from '@/components/StoryFilters'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

async function getAllStories(
  page: number = 1,
  limit: number = 12,
  category?: string,
  search?: string
): Promise<{ stories: SuccessStory[]; totalCount: number }> {
  if (!supabase) {
    return {
      stories: mockRecentStories,
      totalCount: mockRecentStories.length
    }
  }
  
  let query = supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `, { count: 'exact' })
    .order('published_at', { ascending: false })

  if (category) {
    query = query.contains('tags', [category])
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count } = await query.range(from, to)

  return {
    stories: data || [],
    totalCount: count || 0
  }
}

interface StoriesPageProps {
  searchParams: {
    page?: string
    category?: string
    search?: string
  }
}

export default async function StoriesPage({ searchParams }: StoriesPageProps) {
  const page = parseInt(searchParams.page || '1')
  const category = searchParams.category
  const search = searchParams.search

  const { stories, totalCount } = await getAllStories(page, 12, category, search)
  const totalPages = Math.ceil(totalCount / 12)

  const categories = [
    { id: 'funding', name: 'Funding', icon: '💰', count: 15 },
    { id: 'success', name: 'Success', icon: '🚀', count: 8 },
    { id: 'milestone', name: 'Milestone', icon: '🎯', count: 6 },
    { id: 'pivot', name: 'Pivot', icon: '🔄', count: 4 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Startup Success Stories
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover inspiring journeys of recently founded startups that achieved remarkable funding success. 
            Learn from their strategies, challenges, and breakthrough moments.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stories.length}</div>
              <div className="text-sm text-gray-600">Stories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">25</div>
              <div className="text-sm text-gray-600">Startups</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">$2.4B+</div>
              <div className="text-sm text-gray-600">Total Funding</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">2020-2025</div>
              <div className="text-sm text-gray-600">Founded</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/stories?category=${cat.id}`}
                className={`group relative bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 ${
                  category === cat.id ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' : ''
                }`}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </div>
                <div className="text-sm text-gray-500">{cat.count} stories</div>
              </a>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <StoryFilters category={category} search={search} />

        {/* Stories Grid */}
        {stories.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2 bg-white rounded-xl shadow-md p-4">
                  {page > 1 && (
                    <a
                      href={`/stories?page=${page - 1}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      ← Previous
                    </a>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page - 2 + i
                    if (pageNum > totalPages) return null
                    
                    return (
                      <a
                        key={pageNum}
                        href={`/stories?page=${pageNum}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          pageNum === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </a>
                    )
                  })}
                  
                  {page < totalPages && (
                    <a
                      href={`/stories?page=${page + 1}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Next →
                    </a>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No stories found
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {search || category 
                ? 'Try adjusting your search criteria or browse all stories'
                : 'Our AI is working hard to discover more startup success stories. Check back soon!'
              }
            </p>
            {(search || category) && (
              <a
                href="/stories"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                View all stories
              </a>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}