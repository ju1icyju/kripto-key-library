import { useState, useEffect } from 'react';
import { Landmark, RefreshCw, ExternalLink } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { supabase } from '../utils/supabase';

interface FindRecord {
    page_number: string;
    address: string;
    balance: number;
    symbol: string;
    found_at: string;
}

export const Museum: React.FC = () => {
    const { t } = useLang();
    const [finds, setFinds] = useState<FindRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFinds = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('found_wallets')
                .select('*')
                .order('found_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setFinds(data);
            }
        } catch {
            // table might not exist yet
        }
        setLoading(false);
    };

    useEffect(() => { loadFinds(); }, []);

    const truncPage = (p: string) =>
        p.length > 16 ? p.slice(0, 8) + '…' + p.slice(-8) : p;

    const truncAddr = (a: string) =>
        a.length > 16 ? a.slice(0, 8) + '…' + a.slice(-6) : a;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Landmark className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.museumTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.museumSubtitle}</p>
                </div>
            </div>

            {/* Explanation */}
            <div className="glass-panel border border-white/10 rounded-lg p-4 mb-6 text-sm text-gray-400">
                <p>{t.museumDesc}</p>
            </div>

            {/* Finds Table */}
            <div className="glass-panel border border-white/10 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 text-[10px] text-gray-500 uppercase tracking-widest p-3 border-b border-white/5">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">{t.museumDate}</div>
                    <div className="col-span-3">{t.museumPage}</div>
                    <div className="col-span-3">{t.museumAddress}</div>
                    <div className="col-span-2 text-right">{t.museumAmount}</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    </div>
                ) : finds.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4">🏛️</div>
                        <div className="text-gray-400 text-sm mb-2">{t.museumEmpty}</div>
                        <div className="text-gray-600 text-xs">{t.museumEmptyHint}</div>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                        {finds.map((find, i) => (
                            <div key={i} className="grid grid-cols-12 items-center p-3 text-sm font-mono hover:bg-white/5 transition-colors">
                                <div className="col-span-1 text-center text-gray-600">{i + 1}</div>
                                <div className="col-span-3 text-gray-400 text-xs">
                                    {new Date(find.found_at).toLocaleDateString()}
                                </div>
                                <div className="col-span-3 text-terminal-accent text-xs">
                                    #{truncPage(find.page_number)}
                                </div>
                                <div className="col-span-3 text-xs">
                                    <a
                                        href={`https://etherscan.io/address/${find.address}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-terminal-gold hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        {truncAddr(find.address)}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="col-span-2 text-right font-bold text-terminal-warning">
                                    {find.balance.toFixed(4)} {find.symbol}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Refresh */}
            <div className="mt-4 text-center">
                <button
                    onClick={loadFinds}
                    className="text-xs text-gray-500 hover:text-terminal-accent transition-colors flex items-center gap-1 mx-auto"
                >
                    <RefreshCw className="w-3 h-3" /> {t.museumRefresh}
                </button>
            </div>
        </div>
    );
};
