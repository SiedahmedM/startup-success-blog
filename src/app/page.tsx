import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import StoryCard from '@/components/StoryCard'
import FeaturedStory from '@/components/FeaturedStory'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingChatButton from '@/components/chat/FloatingChatButton'

async function getFeaturedStory(): Promise<SuccessStory | null> {
  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

async function getRecentStories(): Promise<SuccessStory[]> {
  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .eq('featured', false)
    .order('published_at', { ascending: false })
    .limit(12)

  return data || []
}

export default async function HomePage() {
  const [featuredStory, recentStories] = await Promise.all([
    getFeaturedStory(),
    getRecentStories()
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {featuredStory && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Story</h2>
            <FeaturedStory story={featuredStory} />
          </section>
        )}

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Latest Success Stories</h2>
            <a 
              href="/stories" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View all stories →
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>

        {recentStories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No stories available yet
            </h3>
            <p className="text-gray-600">
              Our AI is working hard to discover and analyze startup success stories. 
              Check back soon!
            </p>
          </div>
        )}
      </main>

      <Footer />
      <FloatingChatButton />
    </div>
  )
}
