import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import StoryCard from '@/components/StoryCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

async function getAllStories(
  page: number = 1,
  limit: number = 12,
  category?: string,
  search?: string
): Promise<{ stories: SuccessStory[]; totalCount: number }> {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            All Success Stories
          </h1>
          <p className="text-gray-600">
            Discover inspiring startup journeys and learn from their successes
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white">
              <option value="">All Categories</option>
              <option value="funding">Funding</option>
              <option value="milestone">Milestone</option>
              <option value="success">Success</option>
              <option value="pivot">Pivot</option>
            </select>
            
            <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="views">Most Viewed</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search stories..."
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-64"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {stories.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  {page > 1 && (
                    <a
                      href={`/stories?page=${page - 1}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                      className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Previous
                    </a>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page - 2 + i
                    if (pageNum > totalPages) return null
                    
                    return (
                      <a
                        key={pageNum}
                        href={`/stories?page=${pageNum}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}
                        className={`px-3 py-2 rounded-lg border ${
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
                      className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Next
                    </a>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No stories found
            </h3>
            <p className="text-gray-600 mb-4">
              {search || category 
                ? 'Try adjusting your search criteria'
                : 'Our AI is working hard to discover startup success stories. Check back soon!'
              }
            </p>
            {(search || category) && (
              <a
                href="/stories"
                className="text-blue-600 hover:text-blue-800 font-medium"
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