# Startup Success Stories Blog

An automated blog platform that discovers, analyzes, and publishes daily startup success stories using AI and free data sources.

## Features

- **Automated Data Collection**: Gathers startup data from Product Hunt, Hacker News, GitHub, RSS feeds, and web scraping
- **AI-Powered Content Generation**: Uses OpenAI GPT to analyze data and create compelling success stories
- **Data Validation**: Cross-references multiple sources to ensure story accuracy
- **Modern Web Interface**: Built with Next.js 14, TypeScript, and Tailwind CSS
- **Real-time Monitoring**: Built-in metrics, health checks, and error tracking
- **Production-Ready**: Rate limiting, error handling, and automated deployments

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel Pro
- **AI**: OpenAI GPT-4
- **Data Sources**: Product Hunt API, Hacker News API, GitHub API, RSS feeds
- **Web Scraping**: Playwright
- **Monitoring**: Custom metrics and health checks

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Configure your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Product Hunt (Optional - for higher rate limits)
PRODUCT_HUNT_ACCESS_TOKEN=your_product_hunt_token

# GitHub (Optional - for higher rate limits)
GITHUB_TOKEN=your_github_token
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `src/lib/supabase/schema.sql`
3. Configure RLS policies as needed

### 4. Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see your blog.

## Data Sources

### Free APIs Used

- **Product Hunt API**: Daily launches, upvotes, maker info
- **Hacker News API**: "Show HN" posts, launch announcements  
- **GitHub API**: Trending repos, startup tech stacks
- **RSS Feeds**: TechCrunch, VentureBeat, The Verge startup sections

### Web Scraping Targets

- LinkedIn (public company pages)
- Google News (startup announcements)
- IndieHackers (success stories)
- Job postings (growth indicators)

## Automated Data Collection

The system runs automated jobs on the following schedule:

- **Every 6 hours**: Product Hunt, Hacker News data collection
- **Daily at 8 AM**: RSS feed parsing
- **Daily at 12 PM**: GitHub trending repositories
- **Daily at 2 AM**: Web scraping jobs
- **Daily at 4 AM**: AI story generation
- **Weekly**: Database maintenance and cleanup

## AI Content Pipeline

1. **Data Aggregation**: Collect raw data from multiple sources
2. **Success Signal Detection**: Identify funding, growth, milestones
3. **Cross-Reference Validation**: Verify claims across sources
4. **Story Generation**: Create compelling narratives with GPT-4
5. **Quality Scoring**: Rate content confidence and accuracy
6. **Publication**: Auto-publish high-confidence stories

## API Endpoints

- `GET /api/health` - System health check
- `GET /api/metrics` - Performance metrics
- `POST /api/cron` - Manual data collection trigger
- `GET /stories` - All success stories
- `GET /stories/[id]` - Individual story

## Manual Data Collection

Trigger manual data collection:

```bash
curl -X POST http://localhost:3000/api/cron \
  -H "Content-Type: application/json" \
  -d '{"action": "collect", "sources": ["product_hunt", "github"]}'
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Vercel

Set these in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `PRODUCT_HUNT_ACCESS_TOKEN` (optional)
- `GITHUB_TOKEN` (optional)

## Monitoring & Health Checks

The application includes comprehensive monitoring:

- **Health Checks**: Database, OpenAI API, memory usage
- **Metrics**: API requests, data collection rates, error rates
- **Rate Limiting**: Automatic throttling for external APIs
- **Error Tracking**: Detailed error logs with context

Access monitoring at:
- `/api/health` - Overall system health
- `/api/metrics` - Performance metrics

## Rate Limits & Best Practices

- **Product Hunt**: 100 requests/hour (respects API limits)
- **GitHub**: 5000 requests/hour (with token)
- **Hacker News**: No official limits (we use 10 req/min)
- **Web Scraping**: 10 requests/minute with delays
- **OpenAI**: 3000 requests/minute (adjustable)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Data Privacy & Ethics

- Only collects publicly available information
- Respects robots.txt and API terms of service
- Implements proper rate limiting
- Provides source attribution for all content
- Allows content creators to request removal

## License

MIT License - see LICENSE file for details
