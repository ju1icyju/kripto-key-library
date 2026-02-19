// ─── Achievement System ─────────────────────────────────
// Client-side badge tracking via localStorage

export interface Achievement {
    id: string;
    icon: string;
    unlockedAt: number | null; // timestamp or null
}

export type AchievementId =
    | 'first_blood'
    | 'speed_demon'
    | 'decimator'
    | 'centurion'
    | 'night_owl'
    | 'lucky_seven'
    | 'explorer'
    | 'data_nerd'
    | 'daily_winner'
    | 'polyglot';

export const ACHIEVEMENT_DEFS: { id: AchievementId; icon: string }[] = [
    { id: 'first_blood', icon: '🌱' },
    { id: 'speed_demon', icon: '⚡' },
    { id: 'decimator', icon: '🔟' },
    { id: 'centurion', icon: '💯' },
    { id: 'night_owl', icon: '🌙' },
    { id: 'lucky_seven', icon: '🎲' },
    { id: 'explorer', icon: '🔍' },
    { id: 'data_nerd', icon: '📊' },
    { id: 'daily_winner', icon: '🏆' },
    { id: 'polyglot', icon: '🌐' },
];

const STORAGE_KEY = 'ukl_achievements';

const loadState = (): Record<string, number> => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
};

const saveState = (state: Record<string, number>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getAchievements = (): Achievement[] => {
    const state = loadState();
    return ACHIEVEMENT_DEFS.map(def => ({
        id: def.id,
        icon: def.icon,
        unlockedAt: state[def.id] ?? null,
    }));
};

export const isUnlocked = (id: AchievementId): boolean => {
    const state = loadState();
    return !!state[id];
};

export const unlockAchievement = (id: AchievementId): boolean => {
    const state = loadState();
    if (state[id]) return false; // Already unlocked
    state[id] = Date.now();
    saveState(state);
    // Fire custom event for toast notification
    window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: { id } }));
    return true;
};

export const getUnlockedCount = (): number => {
    return Object.keys(loadState()).length;
};

// ─── Stat Tracking (for achievement conditions) ─────────

const STATS_KEY = 'ukl_stats';

interface UserStats {
    eliminations: number;
    randomClicks: number;
    turboUsed: boolean;
    maxPageVisited: string;
}

const loadStats = (): UserStats => {
    try {
        const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
        return {
            eliminations: s.eliminations ?? 0,
            randomClicks: s.randomClicks ?? 0,
            turboUsed: s.turboUsed ?? false,
            maxPageVisited: s.maxPageVisited ?? '0',
        };
    } catch {
        return { eliminations: 0, randomClicks: 0, turboUsed: false, maxPageVisited: '0' };
    }
};

const saveStats = (stats: UserStats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const trackElimination = () => {
    const stats = loadStats();
    stats.eliminations++;
    saveStats(stats);

    // Check achievements
    if (stats.eliminations >= 1) unlockAchievement('first_blood');
    if (stats.eliminations >= 10) unlockAchievement('decimator');
    if (stats.eliminations >= 100) unlockAchievement('centurion');

    // Night owl: between 00:00 and 05:00
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) unlockAchievement('night_owl');
};

export const trackRandomClick = () => {
    const stats = loadStats();
    stats.randomClicks++;
    saveStats(stats);

    if (stats.randomClicks >= 777) unlockAchievement('lucky_seven');
};

export const trackTurboUsed = () => {
    const stats = loadStats();
    if (!stats.turboUsed) {
        stats.turboUsed = true;
        saveStats(stats);
        unlockAchievement('speed_demon');
    }
};

export const trackPageVisited = (page: string) => {
    try {
        const pageBig = BigInt(page);
        // Explorer threshold: any page number > 10^32
        // (MAX_PAGE ≈ 2.7×10^36, so this is achievable by entering large page numbers)
        if (pageBig > BigInt('1' + '0'.repeat(32))) {
            unlockAchievement('explorer');
        }
    } catch { /* ignore */ }
};

export const trackStatsVisited = () => {
    unlockAchievement('data_nerd');
};

export const trackLanguageSwitch = () => {
    unlockAchievement('polyglot');
};

export const trackDailyWin = () => {
    unlockAchievement('daily_winner');
};

export const getUserStats = (): UserStats => loadStats();
