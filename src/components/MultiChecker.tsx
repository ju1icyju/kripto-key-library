import { useState, useRef } from 'react';
import { Search, Loader, ExternalLink, Trash2, Download, ArrowRight } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { ethers } from 'ethers';
import { NETWORKS } from '../utils/api';

interface AddressResult {
    address: string;
    type: 'ETH' | 'BTC' | 'unknown';
    balances: { network: string; balance: number; symbol: string }[];
    status: 'pending' | 'checking' | 'done' | 'error';
    error?: string;
}

// ─── ETH Networks (imported from api.ts — single source of truth) ────────────

// ─── BTC APIs with fallbacks ──────────────────────────────────────────────────

const BTC_APIS = [
    // mempool.space: returns chain_stats, very accurate
    (addr: string) => `https://mempool.space/api/address/${addr}`,
    // blockstream: same format
    (addr: string) => `https://blockstream.info/api/address/${addr}`,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const detectAddressType = (addr: string): 'ETH' | 'BTC' | 'unknown' => {
    const trimmed = addr.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'ETH';
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) return 'BTC';  // P2PKH + P2SH
    if (/^bc1[a-zA-HJ-NP-Z0-9]{25,90}$/.test(trimmed)) return 'BTC';       // Bech32 (P2WPKH / P2WSH / P2TR)
    return 'unknown';
};

// ─── ETH: one address single-network ─────────────────────────────────────────

const fetchEthBalance = async (
    address: string,
    urls: string[],
    ticker: string,
    networkName: string,
    signal: AbortSignal
): Promise<{ network: string; balance: number; symbol: string }> => {
    for (const url of urls) {
        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 }),
                signal,
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.result) {
                const wei = BigInt(data.result);
                return { network: networkName, balance: Number(ethers.formatEther(wei)), symbol: ticker };
            }
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            // Try next URL
        }
    }
    return { network: networkName, balance: -1, symbol: ticker };
};

// ─── ETH: check all networks in parallel ──────────────────────────────────────

const checkEthBalance = async (
    address: string,
    signal: AbortSignal
): Promise<{ network: string; balance: number; symbol: string }[]> => {
    return Promise.all(
        NETWORKS.map(net => fetchEthBalance(address, net.urls, net.ticker, net.name, signal))
    );
};

// ─── BTC: single address check with fallback APIs ────────────────────────────

const checkBtcBalance = async (
    address: string,
    signal: AbortSignal
): Promise<{ network: string; balance: number; symbol: string }> => {
    for (const apiBuilder of BTC_APIS) {
        try {
            const resp = await fetch(apiBuilder(address), { signal });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const funded = data.chain_stats?.funded_txo_sum ?? 0;
            const spent = data.chain_stats?.spent_txo_sum ?? 0;
            return { network: 'Bitcoin', balance: (funded - spent) / 1e8, symbol: 'BTC' };
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            // Try next API
        }
    }
    return { network: 'Bitcoin', balance: -1, symbol: 'BTC' };
};

// ─── BTC BATCH: all addresses in parallel with concurrency cap ────────────────
// mempool.space allows ~10 req/s without auth, we use concurrency of 5.

const checkBtcBatch = async (
    addresses: string[],
    signal: AbortSignal,
    onProgress: (addr: string, result: { network: string; balance: number; symbol: string }) => void
): Promise<void> => {
    const CONCURRENCY = 5;
    const queue = [...addresses];

    const worker = async () => {
        while (queue.length > 0) {
            const addr = queue.shift()!;
            if (signal.aborted) return;
            try {
                const result = await checkBtcBalance(addr, signal);
                onProgress(addr, result);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                onProgress(addr, { network: 'Bitcoin', balance: -1, symbol: 'BTC' });
            }
        }
    };

    // Launch N workers that compete for items in the queue
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, addresses.length) }, worker));
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MultiChecker: React.FC = () => {
    const { t } = useLang();
    const [input, setInput] = useState('');
    const [results, setResults] = useState<AddressResult[]>([]);
    const [checking, setChecking] = useState(false);
    const [limitError, setLimitError] = useState('');
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
            setLimitError(t.checkerMax50);
            return;
        }
        setLimitError('');

        const initial: AddressResult[] = lines.map(addr => ({
            address: addr.trim(),
            type: detectAddressType(addr.trim()),
            balances: [],
            status: 'pending' as const,
        }));

        setResults(initial);
        setChecking(true);

        const controller = new AbortController();
        abortRef.current = controller;
        const signal = controller.signal;

        // ── Separate lists by type ──────────────────────────────────────────
        const ethEntries = initial.filter(e => e.type === 'ETH');
        const btcEntries = initial.filter(e => e.type === 'BTC');
        const unknownEntries = initial.filter(e => e.type === 'unknown');

        // Mark unknowns immediately
        for (const entry of unknownEntries) {
            setResults(prev => prev.map(r =>
                r.address === entry.address ? { ...r, status: 'error', error: t.checkerUnknownFormat } : r
            ));
        }

        // Mark all ETH/BTC as "checking"
        setResults(prev => prev.map(r =>
            r.type === 'ETH' || r.type === 'BTC' ? { ...r, status: 'checking' } : r
        ));

        // ── ETH: parallel per-address ───────────────────────────────────────
        const ethPromises = ethEntries.map(async entry => {
            if (signal.aborted) return;
            try {
                const balances = await checkEthBalance(entry.address, signal);
                setResults(prev => prev.map(r =>
                    r.address === entry.address ? { ...r, balances, status: 'done' } : r
                ));
            } catch (e: any) {
                if (signal.aborted) return;
                setResults(prev => prev.map(r =>
                    r.address === entry.address ? { ...r, status: 'error', error: e.message } : r
                ));
            }
        });

        // ── BTC: parallel pool (5 at a time) ───────────────────────────────
        const btcPromise = checkBtcBatch(
            btcEntries.map(e => e.address),
            signal,
            (addr, result) => {
                setResults(prev => prev.map(r =>
                    r.address === addr
                        ? { ...r, balances: [result], status: result.balance < 0 ? 'error' : 'done', error: result.balance < 0 ? 'Network error' : undefined }
                        : r
                ));
            }
        );

        // ── Run ETH and BTC in parallel ─────────────────────────────────────
        await Promise.all([...ethPromises, btcPromise]);

        if (!signal.aborted) {
            setChecking(false);
        }
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

    const totalNonZero = results.filter(r => r.balances.some(b => b.balance > 0)).length;
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
                    {limitError && (
                        <span className="text-xs text-red-400">{limitError}</span>
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
                            <div key={i} className={`border-b border-white/5 last:border-0 p-3 transition-colors ${r.status === 'checking' ? 'bg-terminal-accent/5' : ''}`}>
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
                                            rel="noopener noreferrer"
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

            {/* CTA */}
            <div className="glass-panel border border-terminal-accent/20 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-3">{t.checkerCta}</p>
                <div className="flex justify-center gap-3">
                    <a href="#" className="bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-4 py-2 rounded text-sm hover:bg-terminal-accent hover:text-black transition-all flex items-center gap-1">
                        {t.checkerCtaExplore} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                    <a href="#turbo" className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-4 py-2 rounded text-sm hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-1">
                        {t.checkerCtaTurbo} <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
};
