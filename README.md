# Startup Success Stories

An experiment in collecting startup signals and turning them into a browsable story archive. It brings together API collectors, source records in Postgres, model-generated articles, and a Next.js frontend.

## Collection and publishing

[The collection orchestrator](src/lib/jobs/data-collection-orchestrator.ts) gathers leads from Product Hunt, Hacker News, GitHub, and RSS feeds. It cleans company names, looks for existing startup records, and stores the source payloads separately from the generated stories.

[The content generator](src/lib/ai/content-generator.ts) calls OpenAI with `gpt-4o-mini`. A separate validation module checks funding requirements, source consistency, and duplicates before the orchestrator inserts a story. Other routes provide manual funding collection and story generation paths.

[The schema](src/lib/supabase/schema.sql) separates `startups`, `data_sources`, `success_stories`, funding events, milestones, and job logs. The frontend reads stories from Supabase and includes sample content for browsing without a configured database. A mentor chat route uses stored stories as context for responses.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase, and the OpenAI SDK. Collectors use HTTP requests and feed parsing; the web scraper and validator use Playwright Chromium.

## Run locally

With Node.js and npm installed, run from the repository root:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000` for the sample story interface. Collection, generation, and mentor chat require service configuration in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-project-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-service-role-key
OPENAI_API_KEY=your-openai-key
```

Initialize a development database with [`schema.sql`](src/lib/supabase/schema.sql), followed by [`migration-add-valuation.sql`](src/lib/supabase/migration-add-valuation.sql). `PRODUCT_HUNT_ACCESS_TOKEN` and `GITHUB_TOKEN` are optional credentials read by their collectors. Install the browser if you are exercising scraping or validation:

```sh
npx playwright install chromium
```

Keep the service role key and OpenAI key on the server.

## Scheduling and limitations

[`vercel.json`](vercel.json) declares a call to `/api/cron` every three hours. That GET route runs Product Hunt, Hacker News, and GitHub collection by default. It does not run the full publishing pipeline. The additional schedules in `DataCollectionOrchestrator.start()` require explicitly starting the in-process scheduler and keeping that process alive.

This remains an ingestion and publishing prototype. Some collectors fall back to sample records, valuation updates use a static list, and some story paths use fixed confidence values. Those scores should not be read as measured factual accuracy.

The homepage runs in development, but a production build currently fails on an extra closing brace in [`generate-missing-stories/route.ts`](src/app/api/generate-missing-stories/route.ts).

The cron and several maintenance routes lack application-level authorization. They need access controls before public deployment. There is no automated test suite, and the JavaScript Next.js config skips type and lint errors during builds. These files describe the intended deployment setup, not a verified running service.
