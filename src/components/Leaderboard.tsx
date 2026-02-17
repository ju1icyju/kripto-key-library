import { useState, useEffect } from 'react';
import { Trophy, User, RefreshCw, Edit3 } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { getLeaderboard, getNickname, setNickname, getUserId, type LeaderboardEntry } from '../utils/supabase';

export const Leaderboard: React.FC = () => {
    const { t } = useLang();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [nick, setNick] = useState(getNickname());
    const [editing, setEditing] = useState(false);
    const [inputNick, setInputNick] = useState(nick);

    const loadData = async () => {
        setLoading(true);
        const data = await getLeaderboard();
        setEntries(data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const saveNick = () => {
        const clean = inputNick.trim().slice(0, 20) || 'Anon';
        setNickname(clean);
        setNick(clean);
        setEditing(false);
    };

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.leaderboardTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.leaderboardSubtitle}</p>
                </div>
            </div>

            {/* Nickname Editor */}
            <div className="glass-panel border border-white/10 rounded-lg p-4 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-terminal-accent" />
                    {editing ? (
                        <input
                            value={inputNick}
                            onChange={e => setInputNick(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveNick()}
                            autoFocus
                            maxLength={20}
                            className="bg-transparent border-b border-terminal-accent text-terminal-accent font-mono text-sm px-1 py-0.5 outline-none w-40"
                        />
                    ) : (
                        <span className="text-terminal-accent font-bold font-mono">{nick}</span>
                    )}
                </div>
                <button
                    onClick={() => editing ? saveNick() : setEditing(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded hover:border-terminal-accent/50"
                >
                    <Edit3 className="w-3 h-3" />
                    {editing ? '✓' : t.nicknameChange}
                </button>
            </div>

            {/* Table */}
            <div className="glass-panel border border-white/10 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 text-[10px] text-gray-500 uppercase tracking-widest p-3 border-b border-white/5">
                    <div className="col-span-2 text-center">{t.leaderboardRank}</div>
                    <div className="col-span-7">{t.leaderboardNick}</div>
                    <div className="col-span-3 text-right">{t.leaderboardScore}</div>
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">{t.leaderboardEmpty}</div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                        {entries.map((entry, i) => {
                            const isYou = entry.user_id === getUserId();
                            return (
                                <div
                                    key={entry.nickname}
                                    className={`grid grid-cols-12 items-center p-3 text-sm font-mono transition-colors ${isYou ? 'bg-terminal-accent/10 border-l-2 border-terminal-accent' :
                                        i < 3 ? 'bg-yellow-400/5' : ''
                                        }`}
                                >
                                    <div className="col-span-2 text-center">
                                        {i < 3 ? (
                                            <span className="text-lg">{medals[i]}</span>
                                        ) : (
                                            <span className="text-gray-500">{i + 1}</span>
                                        )}
                                    </div>
                                    <div className={`col-span-7 truncate ${isYou ? 'text-terminal-accent font-bold' : 'text-gray-300'}`}>
                                        {entry.nickname} {isYou && <span className="text-xs text-terminal-accent/60">{t.leaderboardYou}</span>}
                                    </div>
                                    <div className={`col-span-3 text-right font-bold ${i === 0 ? 'text-yellow-400' :
                                        i === 1 ? 'text-gray-300' :
                                            i === 2 ? 'text-amber-600' :
                                                'text-gray-500'
                                        }`}>
                                        {entry.score.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Refresh */}
            <div className="mt-4 text-center">
                <button
                    onClick={loadData}
                    className="text-xs text-gray-500 hover:text-terminal-accent transition-colors flex items-center gap-1 mx-auto"
                >
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
            </div>
        </div>
    );
};
