import { useState, useEffect } from 'react';
import { BarChart3, MousePointerClick, Trash2, DollarSign, Percent, Globe, TrendingUp } from 'lucide-react';
import { getGlobalStats, type GlobalStats } from '../utils/supabase';
import { MAX_PAGE } from '../utils/crypto';
import { useLang } from '../utils/i18n';

export const Stats: React.FC = () => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLang();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await getGlobalStats();
            setStats(data);
            setLoading(false);
        };
        load();

        const interval = setInterval(async () => {
            const data = await getGlobalStats();
            setStats(data);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const totalPages = MAX_PAGE;
    const eliminatedCount = BigInt(stats?.eliminated_count ?? 0);
    const percentage = totalPages > 0n
        ? Number((eliminatedCount * 10000000000n) / totalPages) / 100000000
        : 0;

    const formatPercentage = () => {
        if (percentage === 0) return '0.00000000%';
        return percentage.toFixed(8) + '%';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-terminal-accent animate-pulse text-lg">{t.loadingData}</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-8">
                <BarChart3 className="w-8 h-8 text-terminal-accent" />
                <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">
                    {t.statsTitle}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Random Clicks */}
                <div className="glass-panel border border-white/10 rounded-lg p-6 hover:border-terminal-accent/30 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-terminal-accent/10 rounded-lg">
                            <MousePointerClick className="w-5 h-5 text-terminal-accent" />
                        </div>
                        <span className="text-gray-400 text-xs uppercase tracking-widest">{t.totalRandomClicks}</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-terminal-accent text-glow-accent">
                        {(stats?.total_random_clicks ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
                        {t.globalAllUsers}
                    </div>
                </div>

                {/* Eliminated Pages */}
                <div className="glass-panel border border-white/10 rounded-lg p-6 hover:border-green-500/30 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Trash2 className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-gray-400 text-xs uppercase tracking-widest">{t.eliminatedSectorsTitle}</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-green-400">
                        {(stats?.eliminated_count ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
                        {t.foreverRemoved}
                    </div>
                </div>

                {/* Percentage */}
                <div className="glass-panel border border-white/10 rounded-lg p-6 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Percent className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-gray-400 text-xs uppercase tracking-widest">{t.cleanPercentage}</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-purple-400 font-mono">
                        {formatPercentage()}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
                        {t.ofTotalSectors}
                    </div>
                </div>

                {/* Found USD */}
                <div className="glass-panel border border-white/10 rounded-lg p-6 hover:border-terminal-warning/30 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-terminal-warning/10 rounded-lg">
                            <DollarSign className="w-5 h-5 text-terminal-warning" />
                        </div>
                        <span className="text-gray-400 text-xs uppercase tracking-widest">{t.fundsFoundTitle}</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-terminal-warning">
                        ${(stats?.total_found_usd ?? 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">
                        {t.totalAllTime}
                    </div>
                </div>
            </div>

            {/* Fun Facts */}
            <div className="glass-panel border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Globe className="w-5 h-5 text-terminal-accent" />
                    <span className="text-gray-400 text-xs uppercase tracking-widest">{t.perspective}</span>
                </div>
                <div className="space-y-3 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-terminal-accent mt-0.5 shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: t.funFact1 }} />
                    </div>
                    <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: t.funFact2 }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
