import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    console.log('🧹 Cleaning up incorrect startup data...')

    // Define proper company data to replace incorrect entries
    const companyData = [
      {
        oldName: 'ewhu',
        newName: 'OmniStock',
        description: 'A high-performance, scalable, and feature-rich inventory management platform for enterprises',
        industry: 'inventory management',
        location: 'Austin, TX',
        employee_count: 12,
        funding_amount: 800000,
        funding_stage: 'seed'
      },
      {
        oldName: '24imepuza',
        newName: 'GameFlow',
        description: 'Advanced gaming technology platform with innovative features for game developers',
        industry: 'gaming technology',
        location: 'Los Angeles, CA',
        employee_count: 8,
        funding_amount: 1200000,
        funding_stage: 'seed'
      },
      {
        oldName: 'sector07-dev',
        newName: 'CyberShield',
        description: 'Next-generation cybersecurity solutions for enterprise protection and threat detection',
        industry: 'cybersecurity',
        location: 'Boston, MA',
        employee_count: 30,
        funding_amount: 3000000,
        funding_stage: 'series_a'
      },
      {
        oldName: 'GrowthHacker',
        newName: 'GrowthHacker',
        description: 'Automated marketing platform that helped 500+ startups achieve 10x growth through AI-powered campaigns',
        industry: 'marketing automation',
        location: 'New York, NY',
        employee_count: 15,
        funding_amount: 1500000,
        funding_stage: 'seed'
      },
      {
        oldName: 'InnovateTech',
        newName: 'InnovateTech',
        description: 'Revolutionary AI platform helping teams boost productivity by 300% through intelligent automation',
        industry: 'artificial intelligence',
        location: 'San Francisco, CA',
        employee_count: 25,
        funding_amount: 2500000,
        funding_stage: 'series_a'
      }
    ]

    let updatedStartups = 0
    let updatedStories = 0

    for (const company of companyData) {
      try {
        // Find startup by old name
        const { data: startup } = await supabaseAdmin
          .from('startups')
          .select('*')
          .ilike('name', company.oldName)
          .single()

        if (startup) {
          // Update startup with correct data
          await supabaseAdmin
            .from('startups')
            .update({
              name: company.newName,
              description: company.description,
              industry: company.industry,
              location: company.location,
              employee_count: company.employee_count,
              funding_amount: company.funding_amount,
              funding_stage: company.funding_stage,
              updated_at: new Date().toISOString()
            })
            .eq('id', startup.id)

          console.log(`✅ Updated startup: ${company.oldName} → ${company.newName}`)

          // Update associated stories
          const { data: stories } = await supabaseAdmin
            .from('success_stories')
            .select('*')
            .eq('startup_id', startup.id)

          if (stories) {
            for (const story of stories) {
              const fundingAmountM = (company.funding_amount / 1000000).toFixed(1)
              const fundingStage = company.funding_stage.replace('_', ' ').toUpperCase()

              // Update story title and content
              const newTitle = `${company.newName} Secures $${fundingAmountM}M in ${fundingStage} Round`
              const newSummary = `${company.newName} has successfully raised $${fundingAmountM} million in ${fundingStage.toLowerCase()} funding, demonstrating strong market validation and growth potential.`

              await supabaseAdmin
                .from('success_stories')
                .update({
                  title: newTitle,
                  summary: newSummary,
                  content: generateCleanStoryContent(company.newName, company),
                  updated_at: new Date().toISOString()
                })
                .eq('id', story.id)

              updatedStories++
            }
          }

          updatedStartups++
        }
      } catch (error) {
        console.error(`Error processing ${company.oldName}:`, error)
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
      message: 'Startup data cleaned successfully',
      updatedStartups,
      updatedStories,
      finalCounts: {
        startups: totalStartups || 0,
        stories: totalStories || 0
      }
    })

  } catch (error) {
    console.error('Data cleaning error:', error)
    return NextResponse.json({ 
      error: 'Failed to clean startup data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateCleanStoryContent(companyName: string, companyData: any): string {
  const fundingAmountM = (companyData.funding_amount / 1000000).toFixed(1)
  const fundingStage = companyData.funding_stage.replace('_', ' ').toUpperCase()
  
  return `${companyName} has achieved a significant milestone by securing $${fundingAmountM} million in ${fundingStage.toLowerCase()} funding, marking a pivotal moment in the company's growth trajectory.

Founded in recent years, the ${companyData.location}-based startup has been making waves in the ${companyData.industry} sector with its innovative approach and strong execution.

## About ${companyName}

${companyData.description}

The company has grown to ${companyData.employee_count} employees and has established itself as a key player in the ${companyData.industry} space. This latest funding round positions ${companyName} for accelerated growth and market expansion.

## Key Achievements

- Successfully raised $${fundingAmountM} million in ${fundingStage.toLowerCase()} funding
- Built a strong team of ${companyData.employee_count} professionals
- Established market presence in ${companyData.location}
- Demonstrated product-market fit in the ${companyData.industry} sector

## Looking Forward

With this new capital injection, ${companyName} is well-positioned to scale its operations, expand its market reach, and continue innovating in the ${companyData.industry} space. The funding will enable the company to accelerate product development, grow its team, and pursue new market opportunities.

This success story exemplifies the potential of innovative startups to secure significant funding and build sustainable businesses in competitive markets.`
} 