-- Venture Ideas table for Venture Lab
-- This tracks business ideas through the research → score → approve → compile lifecycle

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE venture_idea_status AS ENUM (
    'idea',
    'researching',
    'researched',
    'scoring',
    'scored',
    'approved',
    'rejected',
    'parked',
    'compiling',
    'compiled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE venture_idea_verdict AS ENUM (
    'GREEN',
    'YELLOW',
    'RED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the venture_ideas table
CREATE TABLE IF NOT EXISTS venture_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idea basics
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT,
  target_customer TEXT,
  initial_thoughts TEXT,

  -- Status tracking
  status venture_idea_status DEFAULT 'idea' NOT NULL,

  -- Research results
  research_doc_id UUID REFERENCES docs(id) ON DELETE SET NULL,
  research_completed_at TIMESTAMP,
  research_model TEXT,
  research_tokens_used INTEGER,

  -- Scoring results
  score_data JSONB,
  verdict venture_idea_verdict,
  scored_at TIMESTAMP,
  score_input_hash TEXT,

  -- Human approval
  approval_decision TEXT,
  approval_comment TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  -- Compilation results
  venture_id UUID REFERENCES ventures(id) ON DELETE SET NULL,
  compiled_at TIMESTAMP,
  compilation_data JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venture_ideas_status ON venture_ideas(status);
CREATE INDEX IF NOT EXISTS idx_venture_ideas_verdict ON venture_ideas(verdict);
CREATE INDEX IF NOT EXISTS idx_venture_ideas_venture_id ON venture_ideas(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_ideas_research_doc_id ON venture_ideas(research_doc_id);
CREATE INDEX IF NOT EXISTS idx_venture_ideas_created_at ON venture_ideas(created_at);
