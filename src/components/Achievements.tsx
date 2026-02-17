import { useState, useEffect } from 'react';
import { Award, Lock, Unlock } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { getAchievements, type Achievement, type AchievementId } from '../utils/achievements';

export const Achievements: React.FC = () => {
    const { t } = useLang();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    const refreshAchievements = () => setAchievements(getAchievements());

    useEffect(() => {
        refreshAchievements();

        const handleUnlock = (e: Event) => {
            const id = (e as CustomEvent).detail?.id as AchievementId;
            if (id) {
                const achNames: Record<AchievementId, string> = {
                    first_blood: t.achFirstBlood,
                    speed_demon: t.achSpeedDemon,
                    decimator: t.achDecimator,
                    centurion: t.achCenturion,
                    night_owl: t.achNightOwl,
                    lucky_seven: t.achLuckySeven,
                    explorer: t.achExplorer,
                    data_nerd: t.achDataNerd,
                    daily_winner: t.achDailyWinner,
                    polyglot: t.achPolyglot,
                    bot_friend: t.achBotFriend,
                };
                setToast(`🏅 ${achNames[id] || id}`);
                refreshAchievements();
                setTimeout(() => setToast(null), 3000);
            }
        };

        window.addEventListener('achievement-unlocked', handleUnlock);
        return () => window.removeEventListener('achievement-unlocked', handleUnlock);
    }, [t]);

    const achMeta: Record<AchievementId, { name: string; desc: string }> = {
        first_blood: { name: t.achFirstBlood, desc: t.achFirstBloodDesc },
        speed_demon: { name: t.achSpeedDemon, desc: t.achSpeedDemonDesc },
        decimator: { name: t.achDecimator, desc: t.achDecimatorDesc },
        centurion: { name: t.achCenturion, desc: t.achCenturionDesc },
        night_owl: { name: t.achNightOwl, desc: t.achNightOwlDesc },
        lucky_seven: { name: t.achLuckySeven, desc: t.achLuckySevenDesc },
        explorer: { name: t.achExplorer, desc: t.achExplorerDesc },
        data_nerd: { name: t.achDataNerd, desc: t.achDataNerdDesc },
        daily_winner: { name: t.achDailyWinner, desc: t.achDailyWinnerDesc },
        polyglot: { name: t.achPolyglot, desc: t.achPolyglotDesc },
        bot_friend: { name: t.achBotFriend, desc: t.achBotFriendDesc },
    };

    const unlocked = achievements.filter(a => a.unlockedAt !== null).length;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Toast */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 glass-panel border border-yellow-400/50 bg-yellow-400/10 px-4 py-3 rounded-lg text-yellow-400 font-bold text-sm animate-in fade-in slide-in-from-right duration-300">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Award className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.achievementsTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.achievementsSubtitle}</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="glass-panel border border-white/10 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest mb-2">
                    <span>{t.achievementsUnlocked}</span>
                    <span className="text-terminal-accent font-bold">{unlocked} / {achievements.length}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-terminal-accent to-yellow-400 rounded-full transition-all duration-700"
                        style={{ width: `${(unlocked / achievements.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map(ach => {
                    const meta = achMeta[ach.id as AchievementId];
                    const isUnlocked = ach.unlockedAt !== null;

                    return (
                        <div
                            key={ach.id}
                            className={`glass-panel border rounded-lg p-4 flex items-center gap-4 transition-all ${isUnlocked
                                    ? 'border-terminal-accent/30 bg-terminal-accent/5'
                                    : 'border-white/5 opacity-50 grayscale'
                                }`}
                        >
                            <div className={`text-3xl ${isUnlocked ? '' : 'opacity-30'}`}>
                                {ach.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                        {meta?.name || ach.id}
                                    </span>
                                    {isUnlocked ? (
                                        <Unlock className="w-3 h-3 text-terminal-accent" />
                                    ) : (
                                        <Lock className="w-3 h-3 text-gray-600" />
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{meta?.desc}</div>
                                {isUnlocked && ach.unlockedAt && (
                                    <div className="text-[10px] text-terminal-accent/60 mt-1">
                                        {new Date(ach.unlockedAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
