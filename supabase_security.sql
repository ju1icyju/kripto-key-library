-- ============================================================
-- UKL Security: Enable Row Level Security + Constraints
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add missing columns (safe to re-run)
ALTER TABLE eliminated_pages ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT 'Anon';
ALTER TABLE eliminated_pages ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Add constraints on page_number length
-- (prevents garbage data injection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eliminated_pages' 
        AND column_name = 'page_number' 
        AND character_maximum_length IS NOT NULL
    ) THEN
        -- If page_number is TEXT, add a check constraint
        ALTER TABLE eliminated_pages 
            ADD CONSTRAINT page_number_valid 
            CHECK (page_number ~ '^\d{1,78}$');
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- constraint already exists
END $$;

-- 3. Enable RLS on eliminated_pages
ALTER TABLE eliminated_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Anyone can read eliminated pages" ON eliminated_pages;
DROP POLICY IF EXISTS "Anyone can insert eliminated pages" ON eliminated_pages;
DROP POLICY IF EXISTS "No updates allowed" ON eliminated_pages;
DROP POLICY IF EXISTS "No deletes allowed" ON eliminated_pages;

-- Allow anyone to SELECT (leaderboard, stats)
CREATE POLICY "Anyone can read eliminated pages"
    ON eliminated_pages
    FOR SELECT
    USING (true);

-- Allow anyone to INSERT (anon users can record eliminations)
CREATE POLICY "Anyone can insert eliminated pages"
    ON eliminated_pages
    FOR INSERT
    WITH CHECK (true);

-- BLOCK UPDATE and DELETE — no policy = denied by default with RLS on
-- (only service_role key can bypass RLS)

-- 4. Enable RLS on global_stats
ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read global stats" ON global_stats;

-- Allow anyone to READ stats
CREATE POLICY "Anyone can read global stats"
    ON global_stats
    FOR SELECT
    USING (true);

-- BLOCK direct INSERT/UPDATE/DELETE on global_stats from anon
-- Only RPC functions (SECURITY DEFINER) should modify this table

-- 5. Secure RPC functions — recreate with input validation
-- increment_random_clicks: already simple, just increment by 1
CREATE OR REPLACE FUNCTION increment_random_clicks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE global_stats 
    SET total_random_clicks = total_random_clicks + 1 
    WHERE id = 1;
END;
$$;

-- add_found_usd: validate amount range
CREATE OR REPLACE FUNCTION add_found_usd(amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow reasonable amounts (0 < amount < 1,000,000)
    IF amount <= 0 OR amount > 1000000 THEN
        RAISE EXCEPTION 'Invalid amount';
    END IF;
    
    UPDATE global_stats 
    SET total_found_usd = total_found_usd + amount 
    WHERE id = 1;
END;
$$;

-- 6. Grant/revoke appropriate permissions
-- anon can call the RPC functions
GRANT EXECUTE ON FUNCTION increment_random_clicks() TO anon;
GRANT EXECUTE ON FUNCTION add_found_usd(NUMERIC) TO anon;

-- anon CANNOT directly modify global_stats (only via RPC)
REVOKE INSERT, UPDATE, DELETE ON global_stats FROM anon;

-- Verify everything
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('eliminated_pages', 'global_stats', 'found_wallets');

-- ============================================================
-- 7. Museum: found_wallets table
-- ============================================================

CREATE TABLE IF NOT EXISTS found_wallets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    page_number TEXT NOT NULL,
    address TEXT NOT NULL,
    balance NUMERIC NOT NULL CHECK (balance > 0),
    symbol TEXT NOT NULL DEFAULT 'ETH',
    found_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE found_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read found wallets" ON found_wallets;
DROP POLICY IF EXISTS "Anyone can insert found wallets" ON found_wallets;

CREATE POLICY "Anyone can read found wallets"
    ON found_wallets FOR SELECT USING (true);

CREATE POLICY "Anyone can insert found wallets"
    ON found_wallets FOR INSERT WITH CHECK (true);
