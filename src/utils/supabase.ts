import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ddjhequzrmfpkwgzqfzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkamhlcXV6cm1mcGt3Z3pxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzAxOTAsImV4cCI6MjA4Njc0NjE5MH0.ndMZ5Q0Jchkrg00E-KoFggKZvBNn-aLyX6T6CEw5hv4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Record a page as eliminated (verified empty on all networks).
 */
export const recordEliminated = async (pageNumber: string, networksVerified: string[]): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('eliminated_pages')
            .upsert({
                page_number: pageNumber,
                networks_verified: networksVerified,
            }, { onConflict: 'page_number' });

        if (error) {
            console.error('Supabase insert error:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Supabase connection error:', e);
        return false;
    }
};

/**
 * Get total count of eliminated pages.
 */
export const getEliminatedCount = async (): Promise<number> => {
    try {
        const { count, error } = await supabase
            .from('eliminated_pages')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Supabase count error:', error);
            return 0;
        }
        return count ?? 0;
    } catch {
        return 0;
    }
};

/**
 * Check if a specific page was already eliminated.
 */
export const isPageEliminated = async (pageNumber: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('eliminated_pages')
            .select('page_number')
            .eq('page_number', pageNumber)
            .maybeSingle();

        if (error) return false;
        return !!data;
    } catch {
        return false;
    }
};

// ─── Global Stats ─────────────────────────────────────────

export interface GlobalStats {
    total_random_clicks: number;
    total_found_usd: number;
    eliminated_count: number;
}

/**
 * Increment the global random click counter by 1.
 */
export const incrementRandomClicks = async (): Promise<void> => {
    try {
        await supabase.rpc('increment_random_clicks');
    } catch (e) {
        console.error('Failed to increment random clicks:', e);
    }
};

/**
 * Record found USD amount (additive).
 */
export const recordFoundUsd = async (amount: number): Promise<void> => {
    try {
        await supabase.rpc('add_found_usd', { amount });
    } catch (e) {
        console.error('Failed to record found USD:', e);
    }
};

/**
 * Get all global stats in one call.
 */
export const getGlobalStats = async (): Promise<GlobalStats> => {
    try {
        const [statsResult, countResult] = await Promise.all([
            supabase.from('global_stats').select('*').eq('id', 1).maybeSingle(),
            supabase.from('eliminated_pages').select('*', { count: 'exact', head: true }),
        ]);

        return {
            total_random_clicks: statsResult.data?.total_random_clicks ?? 0,
            total_found_usd: statsResult.data?.total_found_usd ?? 0,
            eliminated_count: countResult.count ?? 0,
        };
    } catch {
        return { total_random_clicks: 0, total_found_usd: 0, eliminated_count: 0 };
    }
};
