import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ddjhequzrmfpkwgzqfzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkamhlcXV6cm1mcGt3Z3pxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzAxOTAsImV4cCI6MjA4Njc0NjE5MH0.ndMZ5Q0Jchkrg00E-KoFggKZvBNn-aLyX6T6CEw5hv4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Persistent user identity + nickname
 */
const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export const getUserId = (): string => {
    let id = localStorage.getItem('ukl_user_id');
    if (!id) {
        id = generateUUID();
        localStorage.setItem('ukl_user_id', id);
    }
    return id;
};

export const getNickname = (): string => {
    return localStorage.getItem('ukl_nickname') || 'Anon';
};

export const setNickname = (name: string) => {
    localStorage.setItem('ukl_nickname', name.trim().slice(0, 20) || 'Anon');
};

export const recordEliminated = async (pageNumber: string, networksVerified: string[]): Promise<boolean> => {
    try {
        // Try with nickname + user_id first
        const { error } = await supabase
            .from('eliminated_pages')
            .upsert({
                page_number: pageNumber,
                networks_verified: networksVerified,
                nickname: getNickname(),
                user_id: getUserId(),
            }, { onConflict: 'page_number' });

        if (error) {
            // Fallback: try without nickname/user_id (columns may not exist yet)
            console.warn('Upsert with nickname failed, trying basic:', error.message);
            const { error: fallbackError } = await supabase
                .from('eliminated_pages')
                .upsert({
                    page_number: pageNumber,
                    networks_verified: networksVerified,
                }, { onConflict: 'page_number' });

            if (fallbackError) {
                console.error('Supabase insert error:', fallbackError);
                return false;
            }
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

// ─── Leaderboard ──────────────────────────────────────────

export interface LeaderboardEntry {
    nickname: string;
    user_id: string;
    score: number;
}

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('eliminated_pages')
            .select('nickname, user_id');

        if (error || !data) return [];

        // Group by user_id, take latest nickname per user
        const users: Record<string, { nickname: string; score: number }> = {};
        for (const row of data) {
            const uid = row.user_id || 'unknown';
            if (!users[uid]) {
                users[uid] = { nickname: row.nickname || 'Anon', score: 0 };
            }
            users[uid].score++;
            // Always update to latest nickname (last seen)
            if (row.nickname && row.nickname !== 'Anon') {
                users[uid].nickname = row.nickname;
            }
        }

        return Object.entries(users)
            .map(([user_id, data]) => ({ user_id, nickname: data.nickname, score: data.score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
    } catch {
        return [];
    }
};

// ─── Daily Lucky Page (personal per user) ────────────────────

export const getDailyLuckyPage = async (): Promise<string> => {
    // Personal page: SHA-256(date + user_id)
    const today = new Date().toISOString().slice(0, 10);
    const userId = getUserId();
    const input = new TextEncoder().encode(`UKL-LUCKY-${today}-${userId}`);
    const hash = await crypto.subtle.digest('SHA-256', input);
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    const bigNum = BigInt('0x' + hex);
    const MAX_PAGE = (2n ** 256n) / 128n;
    return ((bigNum % MAX_PAGE) + 1n).toString();
};
