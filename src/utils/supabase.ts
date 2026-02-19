import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ddjhequzrmfpkwgzqfzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkamhlcXV6cm1mcGt3Z3pxZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzAxOTAsImV4cCI6MjA4Njc0NjE5MH0.ndMZ5Q0Jchkrg00E-KoFggKZvBNn-aLyX6T6CEw5hv4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Rate Limiting ────────────────────────────────────────

const rateLimitMap = new Map<string, number>();

/** Returns true if action is allowed, false if rate-limited */
const rateLimit = (key: string, cooldownMs: number): boolean => {
    const now = Date.now();
    const last = rateLimitMap.get(key) || 0;
    if (now - last < cooldownMs) return false;
    rateLimitMap.set(key, now);
    return true;
};

// ─── Input Validation ─────────────────────────────────────

const MAX_PAGE_DIGITS = 78; // 2^256/128 ≈ 9×10^74, max 78 digits

const isValidPageNumber = (page: string): boolean => {
    if (!page || page.length > MAX_PAGE_DIGITS) return false;
    if (!/^\d+$/.test(page)) return false;
    try {
        const n = BigInt(page);
        return n >= 1n && n <= (2n ** 256n / 128n);
    } catch {
        return false;
    }
};

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
    // Single record (legacy / manual check)
    if (!isValidPageNumber(pageNumber)) return false;
    if (!rateLimit('eliminate', 1000)) return false;

    try {
        await supabase.from('eliminated_pages').upsert({
            page_number: pageNumber,
            networks_verified: networksVerified.slice(0, 10),
            nickname: getNickname(),
            user_id: getUserId(),
        }, { onConflict: 'page_number' });
        return true;
    } catch {
        return false;
    }
};

/**
 * Record a batch of eliminated pages (for Turbo mode).
 * Bypasses per-item rate limit, uses batch rate limit.
 */
export const recordBatchEliminated = async (pages: { page: string; networks: string[] }[]): Promise<void> => {
    if (pages.length === 0) return;
    // Rate limit: max 1 batch per 3 seconds
    if (!rateLimit('batch_eliminate', 3000)) return;

    try {
        const rows = pages
            .filter(p => isValidPageNumber(p.page))
            .map(p => ({
                page_number: p.page,
                networks_verified: p.networks.slice(0, 10),
                nickname: getNickname(),
                user_id: getUserId(),
            }));

        if (rows.length === 0) return;

        const { error } = await supabase.from('eliminated_pages').upsert(rows, { onConflict: 'page_number', ignoreDuplicates: true });
        if (error) console.error('Batch upload error:', error);
    } catch (e) {
        console.error('Batch upload failed:', e);
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
    // Rate limit: max 1 RPC call per second (prevents spam)
    if (!rateLimit('click', 1000)) return;
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
    // Validate amount (must be reasonable)
    if (typeof amount !== 'number' || amount <= 0 || amount > 1000000 || !isFinite(amount)) {
        console.warn('Invalid USD amount:', amount);
        return;
    }
    // Rate limit: max 1 per 5 seconds
    if (!rateLimit('found_usd', 5000)) return;
    try {
        await supabase.rpc('add_found_usd', { amount });
    } catch (e) {
        console.error('Failed to record found USD:', e);
    }
};

/**
 * Record an individual found wallet (for the Museum).
 */
export const recordFoundWallet = async (
    pageNumber: string,
    address: string,
    balance: number,
    symbol: string
): Promise<void> => {
    if (!isValidPageNumber(pageNumber)) return;
    if (!address || address.length > 100) return;
    if (balance <= 0 || !isFinite(balance)) return;
    if (!rateLimit('found_wallet', 5000)) return;

    try {
        await supabase.from('found_wallets').insert({
            page_number: pageNumber,
            address,
            balance,
            symbol: symbol.slice(0, 10),
        });
    } catch {
        // table might not exist yet — silent fail
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
