import { useState, useEffect, useCallback } from 'react';
import { Calendar, Target, Clock, Check, ArrowRight } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { getDailyChallengePage, isDailyChallengeCompleted } from '../utils/supabase';
import { trackDailyWin } from '../utils/achievements';

export const DailyChallenge: React.FC = () => {
    const { t } = useLang();
    const [targetPage, setTargetPage] = useState<string>('');
    const [completed, setCompleted] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);

    const loadChallenge = useCallback(async () => {
        setLoading(true);
        const page = await getDailyChallengePage();
        setTargetPage(page);
        const done = await isDailyChallengeCompleted(page);
        setCompleted(done);
        if (done) trackDailyWin();
        setLoading(false);
    }, []);

    useEffect(() => { loadChallenge(); }, [loadChallenge]);

    // Countdown timer
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

    const navigateToPage = () => {
        window.location.hash = '';
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('turbo-navigate', { detail: { page: targetPage } }));
        }, 100);
    };

    const truncatePage = (p: string) =>
        p.length > 30 ? p.slice(0, 12) + '…' + p.slice(-12) : p;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.dailyTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.dailySubtitle}</p>
                </div>
            </div>

            {loading ? (
                <div className="glass-panel border border-white/10 rounded-lg p-8 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto mb-2" />
                </div>
            ) : (
                <>
                    {/* Target Page */}
                    <div className="glass-panel border border-white/10 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest mb-3">
                            <Target className="w-4 h-4" /> {t.dailyTarget}
                        </div>
                        <div className="text-lg md:text-xl font-bold font-mono text-terminal-accent break-all text-glow-accent">
                            #{truncatePage(targetPage)}
                        </div>
                    </div>

                    {/* Status */}
                    <div className={`glass-panel border rounded-lg p-6 mb-6 text-center ${completed
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-yellow-400/20 bg-yellow-400/5'
                        }`}>
                        {completed ? (
                            <div className="flex items-center justify-center gap-3">
                                <Check className="w-6 h-6 text-green-400" />
                                <span className="text-green-400 font-bold text-lg">{t.dailyCompleted}</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-yellow-400/80 mb-4">{t.dailyNotCompleted}</p>
                                <button
                                    onClick={navigateToPage}
                                    className="px-6 py-3 bg-yellow-400/10 border-2 border-yellow-400 text-yellow-400 rounded-lg font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all flex items-center gap-2 mx-auto"
                                >
                                    <ArrowRight className="w-4 h-4" /> {t.dailyGoTo}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Timer */}
                    <div className="glass-panel border border-white/10 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 uppercase tracking-widest mb-2">
                            <Clock className="w-3 h-3" /> {t.dailyNextIn}
                        </div>
                        <div className="text-3xl font-bold font-mono text-gray-300 tracking-[0.3em]">
                            {timeLeft}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
