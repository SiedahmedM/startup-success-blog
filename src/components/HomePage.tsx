'use client'

import { SuccessStory } from '@/lib/types'
import StoryCard from '@/components/StoryCard'
import FeaturedStory from '@/components/FeaturedStory'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingChatButton from '@/components/chat/FloatingChatButton'
import StatsDashboard from '@/components/StatsDashboard'

interface HomePageProps {
  featuredStory: SuccessStory | null
  recentStories: SuccessStory[]
}

export default function HomePage({ featuredStory, recentStories }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10">
        <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsDashboard />
        
        {featuredStory && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Featured Story</h2>
            <FeaturedStory story={featuredStory} />
          </section>
        )}

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Latest Success Stories</h2>
            <a 
              href="/stories" 
              className="text-blue-400 hover:text-blue-300 font-medium"
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
          <div className="text-center py-12 glass-dark rounded-xl border border-white/10">
            <h3 className="text-lg font-medium text-white mb-2">
              No stories available yet
            </h3>
            <p className="text-gray-300">
              Our AI is working hard to discover and analyze startup success stories. 
              Check back soon!
            </p>
          </div>
        )}
      </main>

        <Footer />
        <FloatingChatButton />
      </div>
    </div>
  )
}