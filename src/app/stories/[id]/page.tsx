import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import { mockFeaturedStory, mockRecentStories } from '@/lib/mock-data'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { formatDistanceToNow, format } from 'date-fns'
import { notFound } from 'next/navigation'

// Enable ISR with 1 hour revalidation
export const revalidate = 3600

// Generate static params for the most popular stories
// export async function generateStaticParams() {
//   const { data: stories } = await supabase
//     .from('success_stories')
//     .select('id')
//     .order('view_count', { ascending: false })
//     .limit(20)

//   return stories?.map((story) => ({
//     id: story.id,
//   })) || []
// }

async function getStory(id: string): Promise<SuccessStory | null> {
  if (!supabase) {
    // Return a mock story based on the ID
    if (id === '1') return mockFeaturedStory
    if (id === '2' || id === '3') return mockRecentStories.find(s => s.id === id) || null
    return null
  }
  
  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .eq('id', id)
    .single()

  if (data) {
    await supabase
      .from('success_stories')
      .update({ view_count: data.view_count + 1 })
      .eq('id', id)
  }

  return data
}

async function getRelatedStories(currentId: string, tags: string[]): Promise<SuccessStory[]> {
  if (!tags || tags.length === 0) return []
  if (!supabase) {
    // Return mock related stories
    return mockRecentStories.filter(s => s.id !== currentId).slice(0, 3)
  }

  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .overlaps('tags', tags)
    .neq('id', currentId)
    .order('published_at', { ascending: false })
    .limit(3)

  return data || []
}

interface StoryPageProps {
  params: {
    id: string
  }
}

export default async function StoryPage({ params }: StoryPageProps) {
  const story = await getStory(params.id)
  
  if (!story) {
    notFound()
  }

  const startup = story.startup as any
  const relatedStories = await getRelatedStories(story.id, story.tags || [])

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStoryTypeColor(story.story_type)}`}>
                  {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)} Story
                </span>
                {story.featured && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Featured
                  </span>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                Published {formatDistanceToNow(new Date(story.published_at))} ago
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {story.title}
            </h1>

            {startup && (
              <div className="flex items-center space-x-4 mb-8 p-4 bg-gray-50 rounded-lg">
                {startup.logo_url && (
                  <img
                    src={startup.logo_url}
                    alt={`${startup.name} logo`}
                    className="w-12 h-12 object-contain rounded"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {startup.name}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    {startup.industry && <span>{startup.industry}</span>}
                    {startup.location && (
                      <>
                        <span>•</span>
                        <span>{startup.location}</span>
                      </>
                    )}
                    {startup.website_url && (
                      <>
                        <span>•</span>
                        <a 
                          href={startup.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Website
                        </a>
                      </>
                    )}
                  </div>
                  {startup.current_valuation && (
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="font-medium text-green-600">Current Valuation: </span>
                      <span className="font-semibold text-gray-900 ml-1">${(startup.current_valuation / 1000000).toFixed(1)}M</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {story.summary && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
                <p className="text-lg text-gray-800 leading-relaxed font-medium">
                  {story.summary}
                </p>
              </div>
            )}

            <div className="prose prose-lg max-w-none">
              {story.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span>{story.view_count} views</span>
                  <span>Published on {format(new Date(story.published_at), 'MMMM d, yyyy')}</span>
                  {story.ai_generated && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      AI Generated ({Math.round(story.confidence_score * 100)}% confidence)
                    </span>
                  )}
                </div>
              </div>

              {story.sources && story.sources.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Sources:</h3>
                  <div className="space-y-2">
                    {story.sources.map((source: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {source.type === 'funding_scraped' ? 'Funding Announcement' : source.type}: {source.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {story.tags && story.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Tags:</h3>
                  <div className="flex flex-wrap gap-2">
                    {story.tags.map((tag) => (
                      <a
                        key={tag}
                        href={`/stories?category=${tag}`}
                        className="inline-flex px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        #{tag}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedStories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedStories.map((relatedStory) => (
                <div key={relatedStory.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <a 
                      href={`/stories/${relatedStory.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {relatedStory.title}
                    </a>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {relatedStory.summary || relatedStory.content.substring(0, 100) + '...'}
                  </p>
                  <a
                    href={`/stories/${relatedStory.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Read more →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </div>
  )
}