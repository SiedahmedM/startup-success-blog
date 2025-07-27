import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

const SAMPLE_STARTUPS = [
  {
    name: "TechFlow",
    description: "AI-powered workflow automation platform that helps companies reduce manual tasks by 80%",
    website_url: "https://techflow.example.com",
    founded_date: "2021-03-15",
    funding_amount: 15000000,
    funding_stage: "series_a",
    employee_count: 45,
    location: "San Francisco, CA",
    industry: "SaaS",
    tags: ["ai", "automation", "productivity"],
    story: {
      title: "TechFlow Raises $15M Series A to Revolutionize Workplace Automation",
      content: "TechFlow, a startup that began in a San Francisco garage, has successfully raised $15M in Series A funding. The company struggled initially with finding product-market fit, spending 18 months pivoting from a simple task manager to a comprehensive AI-powered workflow automation platform. The breakthrough came when they realized businesses needed intelligent automation, not just task tracking. Within 6 months of their pivot, they had 200+ enterprise customers and were processing over 1 million automated workflows daily. Their success demonstrates the power of listening to customer feedback and being willing to fundamentally change direction when needed.",
      summary: "TechFlow's journey from a struggling task manager to a $15M Series A success story showcases the importance of pivoting and customer feedback.",
      story_type: "funding",
      tags: ["ai", "automation", "series-a", "pivot"]
    }
  },
  {
    name: "EcoCart",
    description: "Sustainable e-commerce platform connecting conscious consumers with eco-friendly brands",
    website_url: "https://ecocart.example.com",
    founded_date: "2020-08-22",
    funding_amount: 8500000,
    funding_stage: "seed",
    employee_count: 28,
    location: "Austin, TX",
    industry: "E-commerce",
    tags: ["sustainability", "e-commerce", "marketplace"],
    story: {
      title: "EcoCart Hits 500K Users While Building a More Sustainable Future",
      content: "What started as a weekend project by environmental science graduate Sarah Chen has grown into a thriving marketplace with over 500,000 active users. EcoCart faced the classic chicken-and-egg problem: brands wouldn't join without customers, and customers wouldn't come without brands. The turning point came when they partnered with local farmers markets and artisan creators, building trust through community events. Their 'sustainability score' feature, which rates products on environmental impact, became their key differentiator. Despite having no initial funding, they bootstrapped to $2M in annual revenue before raising an $8.5M seed round to expand internationally.",
      summary: "EcoCart's grassroots approach to building a sustainable marketplace led to 500K users and $8.5M in funding.",
      story_type: "milestone",
      tags: ["sustainability", "marketplace", "bootstrap", "community"]
    }
  },
  {
    name: "MindfulAI",
    description: "Mental health platform using AI to provide personalized therapy and wellness coaching",
    website_url: "https://mindfulai.example.com",
    founded_date: "2022-01-10",
    funding_amount: 25000000,
    funding_stage: "series_b",
    employee_count: 85,
    location: "New York, NY",
    industry: "HealthTech",
    tags: ["mental-health", "ai", "therapy"],
    story: {
      title: "MindfulAI's $25M Series B Signals Mental Health Tech Boom",
      content: "Dr. Michael Rodriguez and his team at MindfulAI experienced the startup emotional rollercoaster firsthand. After their initial therapy chatbot was criticized for being 'too robotic,' they nearly shut down. The breakthrough came when they shifted focus from replacing therapists to augmenting them. Their AI now helps human therapists track patient progress, identify patterns, and suggest interventions. This hybrid approach resonated with both therapists and patients, leading to partnerships with major healthcare systems. Their platform now serves over 100,000 patients and has demonstrated 40% better treatment outcomes in clinical trials.",
      summary: "MindfulAI pivoted from replacing therapists to augmenting them, leading to $25M Series B and improved patient outcomes.",
      story_type: "funding",
      tags: ["healthtech", "ai", "mental-health", "pivot", "series-b"]
    }
  },
  {
    name: "CodeCraft",
    description: "No-code platform enabling non-technical users to build complex web applications",
    website_url: "https://codecraft.example.com",
    founded_date: "2021-11-05",
    funding_amount: 12000000,
    funding_stage: "series_a",
    employee_count: 52,
    location: "Seattle, WA",
    industry: "Developer Tools",
    tags: ["no-code", "web-development", "saas"],
    story: {
      title: "CodeCraft Empowers 50K Non-Developers to Build Web Apps",
      content: "Former Google engineers Lisa Park and James Wilson left their comfortable jobs to solve a problem they saw everywhere: talented people with great ideas but no coding skills. Their first attempt was a complex visual programming language that confused even developers. After 8 months of poor user feedback, they simplified everything, focusing on drag-and-drop simplicity. The 'aha moment' came when a 65-year-old small business owner built a complete inventory management system in 2 hours. Word spread through small business communities, and they grew from 100 to 50,000 users in just 8 months, ultimately raising $12M to scale their platform.",
      summary: "CodeCraft's focus on simplicity helped 50K non-developers build web apps, leading to rapid growth and $12M funding.",
      story_type: "milestone",
      tags: ["no-code", "developer-tools", "simplicity", "small-business"]
    }
  },
  {
    name: "FarmConnect",
    description: "IoT platform connecting farmers with real-time crop monitoring and market prices",
    website_url: "https://farmconnect.example.com",
    founded_date: "2020-05-18",
    funding_amount: 18000000,
    funding_stage: "series_a",
    employee_count: 38,
    location: "Des Moines, IA",
    industry: "AgTech",
    tags: ["iot", "agriculture", "farming"],
    story: {
      title: "FarmConnect's IoT Solution Helps 10K Farmers Increase Yields by 30%",
      content: "Growing up on a farm in Iowa, founder Tom Anderson knew firsthand the challenges farmers face with unpredictable weather and market prices. His initial idea was a simple weather app, but farmers told him they needed more. After spending a year living on different farms and understanding their daily struggles, he developed an integrated IoT platform that monitors soil conditions, predicts optimal harvest times, and connects farmers directly to buyers. The platform's AI-driven insights have helped over 10,000 farmers increase their yields by an average of 30% while reducing water usage by 25%. This success attracted $18M in Series A funding to expand across the Midwest.",
      summary: "FarmConnect's comprehensive IoT platform helped 10K farmers increase yields by 30%, attracting $18M in funding.",
      story_type: "milestone",
      tags: ["agtech", "iot", "farming", "sustainability", "ai"]
    }
  }
];

export async function POST() {
  try {
    // Check if we already have sample data
    const { count } = await supabaseAdmin
      .from('startups')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({ 
        message: 'Sample data already exists',
        count: count
      })
    }

    let createdCount = 0

    for (const startupData of SAMPLE_STARTUPS) {
      const { story, ...startup } = startupData

      // Create startup
      const { data: newStartup, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert(startup)
        .select()
        .single()

      if (startupError) {
        console.error('Error creating startup:', startupError)
        continue
      }

      // Create success story
      const { error: storyError } = await supabaseAdmin
        .from('success_stories')
        .insert({
          startup_id: newStartup.id,
          title: story.title,
          content: story.content,
          summary: story.summary,
          story_type: story.story_type,
          confidence_score: 0.85 + Math.random() * 0.15, // Random confidence between 0.85-1.0
          tags: story.tags,
          sources: [
            {
              type: 'seed_data',
              url: startup.website_url
            }
          ],
          ai_generated: true,
          featured: createdCount === 0 // Make first story featured
        })

      if (storyError) {
        console.error('Error creating story:', storyError)
        continue
      }

      // Create data source entry
      await supabaseAdmin
        .from('data_sources')
        .insert({
          startup_id: newStartup.id,
          source_type: 'seed_data',
          source_url: startup.website_url,
          data: {
            type: 'manual_seed',
            created_by: 'system',
            timestamp: new Date().toISOString()
          }
        })

      createdCount++
    }

    return NextResponse.json({ 
      message: `Successfully created ${createdCount} sample startups and stories`,
      count: createdCount
    })

  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      { error: 'Failed to seed data' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Delete all sample data (careful!)
    await supabaseAdmin.from('success_stories').delete().eq('ai_generated', true)
    await supabaseAdmin.from('data_sources').delete().eq('source_type', 'seed_data')  
    await supabaseAdmin.from('startups').delete().in('name', SAMPLE_STARTUPS.map(s => s.name))

    return NextResponse.json({ message: 'Sample data cleared' })
  } catch (error) {
    console.error('Error clearing sample data:', error)
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    )
  }
}