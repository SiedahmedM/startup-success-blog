-- Startups table
CREATE TABLE IF NOT EXISTS startups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    founded_date DATE,
    funding_amount BIGINT,
    funding_stage VARCHAR(50),
    employee_count INTEGER,
    location VARCHAR(255),
    industry VARCHAR(100),
    tags TEXT[],
    social_links JSONB DEFAULT '{}',
    github_repo VARCHAR(500),
    product_hunt_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Success stories table
CREATE TABLE IF NOT EXISTS success_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    story_type VARCHAR(50) DEFAULT 'success', -- success, funding, milestone, pivot
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- AI confidence 0-1
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    sources JSONB DEFAULT '[]',
    ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- product_hunt, hacker_news, github, rss, scrape
    source_url VARCHAR(500) NOT NULL,
    data JSONB NOT NULL,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Funding events table
CREATE TABLE IF NOT EXISTS funding_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    amount BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    funding_stage VARCHAR(50), -- seed, series_a, series_b, etc.
    investors TEXT[],
    announcement_date DATE,
    source_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL, -- revenue, users, product_launch, acquisition
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value BIGINT, -- numerical value if applicable
    unit VARCHAR(50), -- users, dollars, downloads, etc.
    achieved_date DATE,
    source_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job tracking for cron jobs
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_startups_name ON startups(name);
CREATE INDEX IF NOT EXISTS idx_startups_industry ON startups(industry);
CREATE INDEX IF NOT EXISTS idx_startups_founded_date ON startups(founded_date);

CREATE INDEX IF NOT EXISTS idx_success_stories_startup_id ON success_stories(startup_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_published_at ON success_stories(published_at);
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON success_stories(featured);
CREATE INDEX IF NOT EXISTS idx_success_stories_confidence ON success_stories(confidence_score);

CREATE INDEX IF NOT EXISTS idx_data_sources_startup_id ON data_sources(startup_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_funding_events_startup_id ON funding_events(startup_id);
CREATE INDEX IF NOT EXISTS idx_funding_events_date ON funding_events(announcement_date);

CREATE INDEX IF NOT EXISTS idx_milestones_startup_id ON milestones(startup_id);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(achieved_date);

CREATE INDEX IF NOT EXISTS idx_job_logs_name_status ON job_logs(job_name, status);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_logs(started_at);

-- Enable Row Level Security
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON startups FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON success_stories FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON funding_events FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON milestones FOR SELECT USING (true);

-- Create policies for service role full access
CREATE POLICY "Enable full access for service role" ON startups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON success_stories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON data_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON funding_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON milestones FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON job_logs FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_identifier VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- active, closed
    struggle_category VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    struggle_category VARCHAR(100),
    mentioned_startups UUID[], -- array of startup IDs referenced
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics table for monitoring
CREATE TABLE IF NOT EXISTS metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    value DECIMAL NOT NULL,
    unit VARCHAR(50) NOT NULL,
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table for monitoring
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    name VARCHAR(100),
    operation VARCHAR(100),
    component VARCHAR(100),
    user_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_identifier);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_timestamp ON error_logs(severity, timestamp);

-- Enable RLS for chat tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for chat tables (allow all for service role, public read for conversations)
CREATE POLICY "Enable read access for all users" ON chat_conversations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON chat_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON chat_conversations FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable full access for service role" ON metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable full access for service role" ON error_logs FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at triggers
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON startups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_success_stories_updated_at BEFORE UPDATE ON success_stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();