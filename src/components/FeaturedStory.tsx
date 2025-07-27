import Link from 'next/link'
import { SuccessStory } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface FeaturedStoryProps {
  story: SuccessStory
}

export default function FeaturedStory({ story }: FeaturedStoryProps) {
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

  return (
    <article className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/3 bg-gradient-to-br from-blue-500 to-purple-600 p-8 flex items-center justify-center">
          {startup?.logo_url ? (
            <img
              src={startup.logo_url}
              alt={`${startup.name} logo`}
              className="max-h-24 max-w-48 object-contain filter brightness-0 invert"
            />
          ) : (
            <div className="text-white text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">
                  {startup?.name?.charAt(0) || 'S'}
                </span>
              </div>
              <h3 className="text-xl font-bold">{startup?.name || 'Featured Startup'}</h3>
            </div>
          )}
        </div>

        <div className="md:w-2/3 p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStoryTypeColor(story.story_type)}`}>
                {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)} Story
              </span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(story.published_at))} ago
              </span>
            </div>
            {story.confidence_score > 0.8 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            <Link 
              href={`/stories/${story.id}`}
              className="hover:text-blue-600 transition-colors"
            >
              {story.title}
            </Link>
          </h1>

          {startup && (
            <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
              <span className="font-medium">{startup.name}</span>
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
                  <span className="text-green-600 font-medium">
                    ${(startup.funding_amount / 1000000).toFixed(1)}M raised
                  </span>
                </>
              )}
            </div>
          )}

          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {story.summary || story.content.substring(0, 300) + '...'}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>{story.view_count} views</span>
              {story.sources?.length > 0 && (
                <span>{story.sources.length} sources</span>
              )}
            </div>

            <Link
              href={`/stories/${story.id}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Read Full Story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {story.tags && story.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {story.tags.slice(0, 5).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${tag}`}
                    className="inline-flex px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}