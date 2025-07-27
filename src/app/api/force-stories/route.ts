import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🚀 Force generating stories for all startups...')

    // Get all startups
    const { data: startups } = await supabaseAdmin
      .from('startups')
      .select('*')

    console.log(`Found ${startups?.length || 0} startups`)

    if (!startups || startups.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No startups found'
      })
    }

    let storiesGenerated = 0

    for (const startup of startups) {
      try {
        console.log(`📝 Creating story for: ${startup.name}`)

        const fundingAmount = startup.funding_amount / 1000000
        const fundingStage = startup.funding_stage?.replace('_', ' ').toUpperCase() || 'FUNDING'
        
        // Simple story generation
        const storyData = {
          startup_id: startup.id,
          title: `${startup.name} Raises $${fundingAmount.toFixed(1)}M ${fundingStage} to Scale ${startup.industry} Innovation`,
          summary: `${startup.name}, the ${startup.location}-based ${startup.industry} company, has successfully raised $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding, demonstrating strong market validation and growth potential.`,
          content: `${startup.name} has achieved a significant milestone by securing $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding, marking a pivotal moment in the company's growth trajectory.

Founded in ${new Date(startup.founded_date).getFullYear()}, the ${startup.location}-based startup has been making waves in the ${startup.industry} sector with its innovative approach and strong execution.

## About ${startup.name}

${startup.description}

The company has grown to ${startup.employee_count} employees and has established itself as a key player in the ${startup.industry} space. This latest funding round positions ${startup.name} for accelerated growth and market expansion.

## Key Achievements

- Successfully raised $${fundingAmount.toFixed(1)} million in ${fundingStage.toLowerCase()} funding
- Built a strong team of ${startup.employee_count} professionals
- Established market presence in ${startup.location}
- Demonstrated product-market fit in the ${startup.industry} sector

## Looking Forward

With this new capital injection, ${startup.name} is well-positioned to scale its operations, expand its market reach, and continue innovating in the ${startup.industry} space. The funding will enable the company to accelerate product development, grow its team, and pursue new market opportunities.

This success story exemplifies the potential of innovative startups to secure significant funding and build sustainable businesses in competitive markets.`,
          story_type: startup.funding_stage?.includes('series') ? 'funding' : 'milestone',
          confidence_score: 0.90,
          tags: [
            startup.industry?.toLowerCase(),
            startup.funding_stage,
            'startup',
            'funding',
            'success'
          ].filter(Boolean),
          sources: [{
            type: 'automated_generation',
            url: startup.website_url || '',
            confidence: 0.9
          }],
          ai_generated: true,
          featured: storiesGenerated === 0, // Make first one featured
          published_at: new Date().toISOString(),
          view_count: Math.floor(Math.random() * 500) + 100
        }

        // Insert story
        const { data, error: storyError } = await supabaseAdmin
          .from('success_stories')
          .insert(storyData)
          .select()

        if (storyError) {
          console.error(`Error creating story for ${startup.name}:`, storyError)
          continue
        }

        console.log(`✅ Generated story for: ${startup.name}`)
        storiesGenerated++

      } catch (error) {
        console.error(`Error processing ${startup.name}:`, error)
        continue
      }
    }

    // Get final counts
    const { count: totalStories } = await supabaseAdmin
      .from('success_stories')
      .select('*', { count: 'exact', head: true })

    const { count: totalStartups } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Stories generated successfully',
      storiesGenerated,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Story generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}