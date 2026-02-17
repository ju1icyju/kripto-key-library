import { useState, useRef } from 'react';
import { Search, Loader, ExternalLink, Trash2, Download, ArrowRight } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { ethers } from 'ethers';

interface AddressResult {
    address: string;
    type: 'ETH' | 'BTC' | 'unknown';
    balances: { network: string; balance: number; symbol: string }[];
    status: 'pending' | 'checking' | 'done' | 'error';
    error?: string;
}

const ETH_NETWORKS = [
    { name: 'Ethereum', url: 'https://rpc.ankr.com/eth', ticker: 'ETH' },
    { name: 'BNB Chain', url: 'https://bsc-dataseed1.binance.org/', ticker: 'BNB' },
];

const detectAddressType = (addr: string): 'ETH' | 'BTC' | 'unknown' => {
    const trimmed = addr.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'ETH';
    if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) return 'BTC';
    if (/^bc1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(trimmed)) return 'BTC';
    return 'unknown';
};

const checkEthBalance = async (address: string, signal?: AbortSignal): Promise<{ network: string; balance: number; symbol: string }[]> => {
    const results: { network: string; balance: number; symbol: string }[] = [];

    for (const net of ETH_NETWORKS) {
        try {
            const response = await fetch(net.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getBalance',
                    params: [address, 'latest'],
                    id: 1,
                }),
                signal,
            });
            const data = await response.json();
            if (data.result && data.result !== '0x0') {
                const wei = BigInt(data.result);
                if (wei > 0n) {
                    results.push({
                        network: net.name,
                        balance: Number(ethers.formatEther(wei)),
                        symbol: net.ticker,
                    });
                }
            }
            if (!results.find(r => r.network === net.name)) {
                results.push({ network: net.name, balance: 0, symbol: net.ticker });
            }
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            results.push({ network: net.name, balance: -1, symbol: net.ticker });
        }
    }
    return results;
};

const checkBtcBalance = async (address: string, signal?: AbortSignal): Promise<{ network: string; balance: number; symbol: string }[]> => {
    try {
        const response = await fetch(`https://mempool.space/api/address/${address}`, { signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const funded = data.chain_stats?.funded_txo_sum ?? 0;
        const spent = data.chain_stats?.spent_txo_sum ?? 0;
        const balance = (funded - spent) / 1e8; // satoshis to BTC
        return [{ network: 'Bitcoin', balance, symbol: 'BTC' }];
    } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        return [{ network: 'Bitcoin', balance: -1, symbol: 'BTC' }];
    }
};

export const MultiChecker: React.FC = () => {
    const { t } = useLang();
    const [input, setInput] = useState('');
    const [results, setResults] = useState<AddressResult[]>([]);
    const [checking, setChecking] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const startCheck = async () => {
        if (checking) {
            abortRef.current?.abort();
            setChecking(false);
            return;
        }

        const lines = input
            .split(/[\n,;]+/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        if (lines.length === 0) return;
        if (lines.length > 50) {
            alert(t.checkerMax50);
            return;
        }

        const initial: AddressResult[] = lines.map(addr => ({
            address: addr,
            type: detectAddressType(addr),
            balances: [],
            status: 'pending',
        }));

        setResults(initial);
        setChecking(true);
        const controller = new AbortController();
        abortRef.current = controller;

        for (let i = 0; i < initial.length; i++) {
            if (controller.signal.aborted) break;

            setResults(prev => prev.map((r, idx) =>
                idx === i ? { ...r, status: 'checking' } : r
            ));

            const entry = initial[i];
            try {
                let balances: { network: string; balance: number; symbol: string }[] = [];

                if (entry.type === 'ETH') {
                    balances = await checkEthBalance(entry.address, controller.signal);
                } else if (entry.type === 'BTC') {
                    balances = await checkBtcBalance(entry.address, controller.signal);
                    // Rate limit mempool.space (no auth)
                    await new Promise(r => setTimeout(r, 300));
                } else {
                    setResults(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, status: 'error', error: t.checkerUnknownFormat } : r
                    ));
                    continue;
                }

                setResults(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, balances, status: 'done' } : r
                ));
            } catch (e: any) {
                if (e.name === 'AbortError') break;
                setResults(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, status: 'error', error: e.message } : r
                ));
            }
        }

        setChecking(false);
    };

    const clearAll = () => {
        abortRef.current?.abort();
        setResults([]);
        setInput('');
        setChecking(false);
    };

    const exportCsv = () => {
        const header = 'Address,Type,Network,Balance,Symbol\n';
        const rows = results.flatMap(r =>
            r.balances.length > 0
                ? r.balances.map(b => `${r.address},${r.type},${b.network},${b.balance},${b.symbol}`)
                : [`${r.address},${r.type},,${r.status === 'error' ? r.error : ''},`]
        );
        const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'balances.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalNonZero = results.filter(r =>
        r.balances.some(b => b.balance > 0)
    ).length;

    const progress = results.length > 0
        ? results.filter(r => r.status === 'done' || r.status === 'error').length
        : 0;

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Search className="w-8 h-8 text-terminal-accent" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.checkerTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.checkerSubtitle}</p>
                </div>
            </div>

            {/* SEO text */}
            <p className="text-gray-500 text-sm mb-6">{t.checkerSeoDesc}</p>

            {/* Input */}
            <div className="glass-panel border border-white/10 rounded-lg p-5 mb-5">
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">{t.checkerInputLabel}</label>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={t.checkerPlaceholder}
                    rows={5}
                    className="w-full bg-black/50 border border-white/10 text-terminal-gold font-mono text-xs px-4 py-3 rounded focus:outline-none focus:border-terminal-accent transition-colors resize-y"
                    disabled={checking}
                />
                <div className="flex items-center gap-3 mt-3">
                    <button
                        onClick={startCheck}
                        className={`px-6 py-2.5 rounded font-bold uppercase tracking-wider text-sm transition-all ${checking
                                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white'
                                : 'bg-terminal-accent/10 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black'
                            }`}
                    >
                        {checking ? t.checkerStop : t.checkerStart}
                    </button>
                    {results.length > 0 && (
                        <>
                            <button onClick={clearAll} className="text-gray-500 hover:text-white transition-colors" title="Clear">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={exportCsv} className="text-gray-500 hover:text-terminal-accent transition-colors" title="Export CSV">
                                <Download className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {checking && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Loader className="w-3 h-3 animate-spin" />
                            {progress}/{results.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="glass-panel border border-white/10 rounded-lg overflow-hidden mb-5">
                    {/* Summary */}
                    <div className="flex items-center justify-between p-3 border-b border-white/5 text-xs">
                        <span className="text-gray-400">
                            {t.checkerAddresses}: <strong className="text-white">{results.length}</strong>
                        </span>
                        <span className="text-gray-400">
                            {t.checkerWithBalance}: <strong className={totalNonZero > 0 ? 'text-terminal-warning' : 'text-gray-500'}>{totalNonZero}</strong>
                        </span>
                    </div>

                    {/* Table */}
                    <div className="max-h-[500px] overflow-y-auto">
                        {results.map((r, i) => (
                            <div key={i} className={`border-b border-white/5 last:border-0 p-3 transition-colors ${r.status === 'checking' ? 'bg-terminal-accent/5' : ''
                                }`}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${r.type === 'ETH' ? 'bg-blue-500/20 text-blue-400' :
                                                r.type === 'BTC' ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>{r.type}</span>
                                        <code className="text-xs text-terminal-gold font-mono truncate">{r.address}</code>
                                    </div>
                                    <div className="shrink-0">
                                        {r.status === 'checking' && <Loader className="w-3.5 h-3.5 animate-spin text-terminal-accent" />}
                                        {r.status === 'pending' && <span className="text-[10px] text-gray-600">⏳</span>}
                                        {r.status === 'error' && <span className="text-[10px] text-red-500">{r.error}</span>}
                                    </div>
                                </div>
                                {r.status === 'done' && (
                                    <div className="flex flex-wrap gap-3 ml-12">
                                        {r.balances.map((b, bi) => (
                                            <div key={bi} className="text-xs">
                                                <span className="text-gray-500">{b.network}: </span>
                                                {b.balance < 0 ? (
                                                    <span className="text-red-400">error</span>
                                                ) : b.balance === 0 ? (
                                                    <span className="text-gray-600">0 {b.symbol}</span>
                                                ) : (
                                                    <span className="text-terminal-warning font-bold">{b.balance.toFixed(6)} {b.symbol}</span>
                                                )}
                                            </div>
                                        ))}
                                        <a
                                            href={r.type === 'ETH'
                                                ? `https://etherscan.io/address/${r.address}`
                                                : `https://mempool.space/address/${r.address}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-gray-600 hover:text-terminal-accent transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTA to main site */}
            <div className="glass-panel border border-terminal-accent/20 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-3">{t.checkerCta}</p>
                <div className="flex justify-center gap-3">
                    <a
                        href="#"
                        className="bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-4 py-2 rounded text-sm hover:bg-terminal-accent hover:text-black transition-all flex items-center gap-1"
                    >
                        {t.checkerCtaExplore} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                    <a
                        href="#turbo"
                        className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-4 py-2 rounded text-sm hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-1"
                    >
                        {t.checkerCtaTurbo} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
};
