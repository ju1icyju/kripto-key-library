import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const supabase = config.supabaseUrl && config.supabaseKey
    ? createClient(config.supabaseUrl, config.supabaseKey)
    : null;

export const recordEliminated = async (pageNumber: string, networks: string[]) => {
    if (!supabase) return;
    try {
        await supabase.from('eliminated_pages').upsert(
            { page_number: pageNumber, networks_verified: networks },
            { onConflict: 'page_number' }
        );
    } catch { /* silent */ }
};

export const incrementRandomClicks = async () => {
    if (!supabase) return;
    try {
        await supabase.rpc('increment_random_clicks');
    } catch { /* silent */ }
};

export interface GlobalStats {
    totalClicks: number;
    eliminatedCount: number;
    totalFoundUsd: number;
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
    const defaults: GlobalStats = { totalClicks: 0, eliminatedCount: 0, totalFoundUsd: 0 };
    if (!supabase) return defaults;

    try {
        // Get stats row
        const { data: statsData } = await supabase
            .from('global_stats')
            .select('total_random_clicks, total_found_usd')
            .eq('id', 1)
            .single();

        // Count eliminated
        const { count } = await supabase
            .from('eliminated_pages')
            .select('*', { count: 'exact', head: true });

        return {
            totalClicks: statsData?.total_random_clicks ?? 0,
            eliminatedCount: count ?? 0,
            totalFoundUsd: statsData?.total_found_usd ?? 0,
        };
    } catch {
        return defaults;
    }
};
