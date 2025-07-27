import { supabase } from '@/lib/supabase/client'
import { SuccessStory } from '@/lib/types'
import { mockFeaturedStory, mockRecentStories } from '@/lib/mock-data'
import HomePage from '@/components/HomePage'

// Enable static generation with ISR
export const revalidate = 1800 // 30 minutes

async function getFeaturedStory(): Promise<SuccessStory | null> {
  if (!supabase) return mockFeaturedStory
  
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

  return data || mockFeaturedStory
}

async function getRecentStories(): Promise<SuccessStory[]> {
  if (!supabase) return mockRecentStories
  
  const { data } = await supabase
    .from('success_stories')
    .select(`
      *,
      startup:startups(*)
    `)
    .eq('featured', false)
    .order('published_at', { ascending: false })
    .limit(12)

  return data || mockRecentStories
}

export default async function Page() {
  const [featuredStory, recentStories] = await Promise.all([
    getFeaturedStory(),
    getRecentStories()
  ])

  return <HomePage featuredStory={featuredStory} recentStories={recentStories} />
}
