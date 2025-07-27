'use client'

import Link from 'next/link'
import { SuccessStory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface FeaturedStoryProps {
  story: SuccessStory
}

export default function FeaturedStory({ story }: FeaturedStoryProps) {
  const startup = story.startup as any

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case 'funding':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'milestone':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'pivot':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  }

  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-dark rounded-xl shadow-2xl overflow-hidden border border-white/10 relative"
    >
      <div className="absolute top-4 right-4">
        <svg className="w-8 h-8 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
      
      <div className="md:flex">
        <div className="md:w-1/3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-8 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
          {startup?.logo_url ? (
            <img
              src={startup.logo_url}
              alt={`${startup.name} logo`}
              className="max-h-24 max-w-48 object-contain relative z-10 filter drop-shadow-xl"
            />
          ) : (
            <div className="text-white text-center relative z-10">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">
                  {startup?.name?.charAt(0) || 'S'}
                </span>
              </div>
              <h3 className="text-xl font-bold">{startup?.name || 'Featured Startup'}</h3>
            </div>
          )}
        </div>

        <div className="md:w-2/3 p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStoryTypeColor(story.story_type)}`}>
                {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)} Story
              </span>
              <span className="text-sm text-gray-400">
                {formatDistanceToNow(new Date(story.published_at))} ago
              </span>
            </div>
            {story.confidence_score > 0.8 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 rounded-full">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
            <Link 
              href={`/stories/${story.id}`}
              className="hover:text-blue-300 transition-colors"
            >
              {story.title}
            </Link>
          </h1>

          {startup && (
            <div className="flex items-center space-x-4 mb-4 text-sm text-gray-300">
              <span className="font-medium text-white">{startup.name}</span>
              {startup.industry && (
                <>
                  <span>•</span>
                  <span>{startup.industry}</span>
                </>
              )}
              {startup.location && (
                <>
                  <span>•</span>
                  <span>{startup.location}</span>
                </>
              )}
              {startup.funding_amount && (
                <>
                  <span>•</span>
                  <span className="text-green-400 font-medium">
                    ${(startup.funding_amount / 1000000).toFixed(1)}M raised
                  </span>
                </>
              )}
            </div>
          )}

          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            {story.summary || story.content.substring(0, 300) + '...'}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>{story.view_count} views</span>
              {story.sources?.length > 0 && (
                <span>{story.sources.length} sources</span>
              )}
            </div>

            <Link
              href={`/stories/${story.id}`}
              className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-all hover:scale-105"
            >
              Read Full Story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {story.tags && story.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex flex-wrap gap-2">
                {story.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-3 py-1 text-sm text-blue-300 bg-blue-500/20 rounded-full border border-blue-500/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}