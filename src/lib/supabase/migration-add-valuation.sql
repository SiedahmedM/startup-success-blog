-- Add current valuation and valuation date fields to startups table
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS current_valuation BIGINT,
ADD COLUMN IF NOT EXISTS valuation_date DATE;

-- Add index for current valuation
CREATE INDEX IF NOT EXISTS idx_startups_current_valuation ON startups(current_valuation);

-- Add funding date field to startups table for better tracking
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS funding_date DATE;

-- Add index for funding date
CREATE INDEX IF NOT EXISTS idx_startups_funding_date ON startups(funding_date); 