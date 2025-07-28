'use client'

import Link from 'next/link'
import { SuccessStory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface StoryCardProps {
  story: SuccessStory
}

export default function StoryCard({ story }: StoryCardProps) {
  const startup = story.startup as any

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case 'funding':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'milestone':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pivot':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const estimatedReadTime = Math.ceil((story.content.length + (story.summary?.length || 0)) / 200)

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl overflow-hidden border border-gray-100 group transition-all duration-300"
    >
      {startup?.logo_url && (
        <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-indigo-100/50"></div>
          <img
            src={startup.logo_url}
            alt={`${startup.name} logo`}
            className="max-h-16 max-w-32 object-contain relative z-10 filter drop-shadow-lg"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStoryTypeColor(story.story_type)}`}>
            {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)}
          </span>
          {story.ai_generated && (
            <span className={`text-xs font-medium ${getConfidenceColor(story.confidence_score)}`}>
              {Math.round(story.confidence_score * 100)}% confidence
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          <Link 
            href={`/stories/${story.id}`}
            className="hover:text-blue-600 transition-colors"
          >
            {story.title}
          </Link>
        </h3>

        {startup && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{startup.name}</span>
                {startup.industry && (
                  <span className="ml-2 text-gray-500">• {startup.industry}</span>
                )}
              </p>
            </div>
            {startup.current_valuation && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">Current Valuation: </span>
                  <span className="font-semibold text-gray-900">${(startup.current_valuation / 1000000).toFixed(1)}M</span>
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
          {story.summary || story.content.substring(0, 150) + '...'}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{formatDistanceToNow(new Date(story.published_at))} ago</span>
            </div>
            <span>•</span>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span>{story.view_count} views</span>
            </div>
            <span>•</span>
            <span>{estimatedReadTime} min read</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {story.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded-full border border-blue-200 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
                {story.tags.length > 3 && (
                  <span className="inline-flex px-2 py-1 text-xs text-gray-500">
                    +{story.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
          
          <Link
            href={`/stories/${story.id}`}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform ml-4"
          >
            Read more →
          </Link>
        </div>
      </div>
    </motion.article>
  )
}