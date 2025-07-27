import Link from 'next/link'
import { SuccessStory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface StoryCardProps {
  story: SuccessStory
}

export default function StoryCard({ story }: StoryCardProps) {
  const startup = story.startup as any

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case 'funding':
        return 'bg-green-100 text-green-800'
      case 'milestone':
        return 'bg-blue-100 text-blue-800'
      case 'pivot':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-purple-100 text-purple-800'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <article className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {startup?.logo_url && (
        <div className="h-48 bg-gray-100 flex items-center justify-center">
          <img
            src={startup.logo_url}
            alt={`${startup.name} logo`}
            className="max-h-16 max-w-32 object-contain"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStoryTypeColor(story.story_type)}`}>
            {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)}
          </span>
          {story.ai_generated && (
            <span className={`text-xs ${getConfidenceColor(story.confidence_score)}`}>
              {Math.round(story.confidence_score * 100)}% confidence
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          <Link 
            href={`/stories/${story.id}`}
            className="hover:text-blue-600 transition-colors"
          >
            {story.title}
          </Link>
        </h3>

        {startup && (
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">{startup.name}</span>
            {startup.industry && (
              <span className="ml-2 text-gray-500">• {startup.industry}</span>
            )}
          </p>
        )}

        <p className="text-gray-700 text-sm line-clamp-3 mb-4">
          {story.summary || story.content.substring(0, 150) + '...'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(story.published_at))} ago</span>
            <span>•</span>
            <span>{story.view_count} views</span>
          </div>
          
          <Link
            href={`/stories/${story.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Read more →
          </Link>
        </div>

        {story.tags && story.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {story.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded"
                >
                  {tag}
                </span>
              ))}
              {story.tags.length > 3 && (
                <span className="inline-flex px-2 py-1 text-xs text-gray-500">
                  +{story.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}