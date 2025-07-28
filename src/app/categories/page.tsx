import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import StoryCard from '@/components/StoryCard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

async function getStoriesByCategory(category: string): Promise<SuccessStory[]> {
  if (!supabase) {
    return []
  }
  
  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .contains('tags', [category])
    .order('published_at', { ascending: false })

  return data || []
}

interface CategoriesPageProps {
  searchParams: {
    category?: string
  }
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const category = searchParams.category || 'funding'
  const stories = await getStoriesByCategory(category)

  const categories = [
    { 
      id: 'funding', 
      name: 'Funding Stories', 
      icon: '💰', 
      description: 'Startups that secured significant funding rounds',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'success', 
      name: 'Success Stories', 
      icon: '🚀', 
      description: 'Companies that achieved remarkable growth and success',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'milestone', 
      name: 'Milestone Stories', 
      icon: '🎯', 
      description: 'Key milestones and breakthrough moments',
      color: 'from-purple-500 to-indigo-500'
    },
    { 
      id: 'pivot', 
      name: 'Pivot Stories', 
      icon: '🔄', 
      description: 'Startups that successfully pivoted their business model',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const currentCategory = categories.find(cat => cat.id === category) || categories[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {currentCategory.name}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {currentCategory.description}
          </p>
        </div>

        {/* Category Navigation */}
        <div className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/categories?category=${cat.id}`}
                className={`group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 ${
                  category === cat.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {stories.filter(s => s.tags?.includes(cat.id)).length} stories
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Stories Grid */}
        {stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No stories in this category
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We're working on discovering more {currentCategory.name.toLowerCase()}. 
              Check back soon or browse other categories.
            </p>
            <a
              href="/stories"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse all stories
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
} 