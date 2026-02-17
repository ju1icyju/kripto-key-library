import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Target, Clock, ArrowRight, Dice5 } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { getDailyLuckyPage } from '../utils/supabase';

export const DailyChallenge: React.FC = () => {
    const { t } = useLang();
    const [luckyPage, setLuckyPage] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);

    const loadLuckyPage = useCallback(async () => {
        setLoading(true);
        const page = await getDailyLuckyPage();
        setLuckyPage(page);
        // Check if already revealed today
        const todayKey = `ukl_lucky_revealed_${new Date().toISOString().slice(0, 10)}`;
        if (localStorage.getItem(todayKey)) {
            setRevealed(true);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadLuckyPage(); }, [loadLuckyPage]);

    // Countdown timer to midnight UTC
    useEffect(() => {
        const update = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleReveal = () => {
        setRevealed(true);
        const todayKey = `ukl_lucky_revealed_${new Date().toISOString().slice(0, 10)}`;
        localStorage.setItem(todayKey, '1');
    };

    const navigateToPage = () => {
        window.location.hash = '';
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('turbo-navigate', { detail: { page: luckyPage } }));
        }, 100);
    };

    const truncatePage = (p: string) =>
        p.length > 30 ? p.slice(0, 12) + '…' + p.slice(-12) : p;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.dailyTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.dailySubtitle}</p>
                </div>
            </div>

            {loading ? (
                <div className="glass-panel border border-white/10 rounded-lg p-8 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto mb-2" />
                </div>
            ) : !revealed ? (
                /* Unrevealed state — big reveal button */
                <div className="glass-panel border border-yellow-400/20 rounded-lg p-8 text-center">
                    <Dice5 className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                    <p className="text-gray-400 mb-6 text-sm">{t.dailySubtitle}</p>
                    <button
                        onClick={handleReveal}
                        className="px-8 py-4 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border-2 border-yellow-400 text-yellow-400 rounded-xl font-bold text-lg uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all transform hover:scale-105 active:scale-95"
                    >
                        🎲 {t.dailyReveal}
                    </button>
                </div>
            ) : (
                /* Revealed — show the lucky page */
                <>
                    <div className="glass-panel border border-yellow-400/30 bg-yellow-400/5 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-2 text-xs text-yellow-400/70 uppercase tracking-widest mb-3">
                            <Target className="w-4 h-4" /> {t.dailyTarget}
                        </div>
                        <div className="text-lg md:text-xl font-bold font-mono text-yellow-400 break-all text-glow mb-4">
                            #{truncatePage(luckyPage)}
                        </div>
                        <button
                            onClick={navigateToPage}
                            className="px-6 py-3 bg-yellow-400/10 border-2 border-yellow-400 text-yellow-400 rounded-lg font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all flex items-center gap-2 mx-auto"
                        >
                            <ArrowRight className="w-4 h-4" /> {t.dailyGoTo}
                        </button>
                    </div>

                    <div className="glass-panel border border-white/10 rounded-lg p-4 mb-4 text-center">
                        <p className="text-xs text-gray-500 mb-2">{t.dailyPersonal}</p>
                        <p className="text-gray-600 text-[10px]">{t.dailyPersonalDesc}</p>
                    </div>
                </>
            )}

            {/* Timer */}
            <div className="glass-panel border border-white/10 rounded-lg p-4 text-center mt-6">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 uppercase tracking-widest mb-2">
                    <Clock className="w-3 h-3" /> {t.dailyNextIn}
                </div>
                <div className="text-3xl font-bold font-mono text-gray-300 tracking-[0.3em]">
                    {timeLeft}
                </div>
            </div>
        </div>
    );
};
