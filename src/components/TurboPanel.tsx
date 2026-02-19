import { useState, useRef, useCallback, useEffect } from 'react';
import { Zap, Play, Square, Activity, Gauge, Trash2, DollarSign, Settings2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { generateWallet, MAX_PAGE, ROWS_PER_PAGE } from '../utils/crypto';
import { checkBalances, AVAILABLE_NETWORKS, type SpeedMode, type BalanceResult } from '../utils/api';
import { recordEliminated, incrementRandomClicks, recordFoundWallet, recordBatchEliminated } from '../utils/supabase';
import { trackElimination, trackTurboUsed } from '../utils/achievements';

interface TurboResult {
    page: string;
    status: 'verified' | 'error' | 'found';
    balances: BalanceResult[];
    timestamp: number;
}

export const TurboPanel: React.FC = () => {
    const { t } = useLang();

    // Config
    const [parallelPages, setParallelPages] = useState(3);
    const [speed, setSpeed] = useState<SpeedMode>('fast');
    const [enabledNetworks, setEnabledNetworks] = useState<string[]>([...AVAILABLE_NETWORKS]);

    // State
    const [running, setRunning] = useState(false);
    const [scannedCount, setScannedCount] = useState(0);
    const [eliminatedCount, setEliminatedCount] = useState(0);
    const [totalFoundUsd, setTotalFoundUsd] = useState(0);
    const [results, setResults] = useState<TurboResult[]>([]);
    const [foundAlerts, setFoundAlerts] = useState<TurboResult[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [pagesPerMin, setPagesPerMin] = useState(0);

    const abortRef = useRef<AbortController | null>(null);
    const runningRef = useRef(false);

    // Speed calc
    useEffect(() => {
        if (!startTime || scannedCount === 0) {
            setPagesPerMin(0);
            return;
        }
        const elapsed = (Date.now() - startTime) / 60000;
        if (elapsed > 0) {
            setPagesPerMin(Math.round(scannedCount / elapsed));
        }
    }, [scannedCount, startTime]);

    const generateRandomPage = (): string => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        const rand = BigInt('0x' + hex);
        return ((rand % MAX_PAGE) + 1n).toString();
    };

    const navigateToPage = (page: string) => {
        // Store the target page and navigate to home view
        window.location.hash = '';
        // Use a custom event to communicate the page number to App
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('turbo-navigate', { detail: { page } }));
        }, 100);
    };

    const scanPage = useCallback(async (page: string, signal: AbortSignal): Promise<TurboResult | null> => {
        if (signal.aborted) return null;

        const ethAddresses: string[] = [];
        for (let i = 0; i < Number(ROWS_PER_PAGE); i++) {
            try {
                const w = generateWallet(i, page);
                ethAddresses.push(w.ethAddress);
            } catch {
                // skip
            }
        }

        try {
            const result = await checkBalances(ethAddresses, signal, { speed, networks: enabledNetworks });
            if (result.aborted) return null;

            if (result.balances.length > 0) {
                return { page, status: 'found', balances: result.balances, timestamp: Date.now() };
            } else if (result.allVerified) {
                recordEliminated(page, result.networksVerified);
                return { page, status: 'verified', balances: [], timestamp: Date.now() };
            } else {
                return { page, status: 'error', balances: [], timestamp: Date.now() };
            }
        } catch {
            return null;
        }
    }, [speed, enabledNetworks]);

    // Batch elimination buffer
    const eliminatedBufferRef = useRef<{ page: string; networks: string[] }[]>([]);

    const flushEliminations = useCallback(async () => {
        const batch = [...eliminatedBufferRef.current];
        if (batch.length === 0) return;

        eliminatedBufferRef.current = [];
        await recordBatchEliminated(batch);
    }, []);

    // Flush periodically
    useEffect(() => {
        if (!running) return;
        const timer = setInterval(flushEliminations, 5000);
        return () => {
            clearInterval(timer);
            flushEliminations(); // flush on stop
        };
    }, [running, flushEliminations]);

    const runTurbo = useCallback(async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        runningRef.current = true;
        setRunning(true);
        setStartTime(Date.now());
        trackTurboUsed();

        while (runningRef.current && !controller.signal.aborted) {
            const pages = Array.from({ length: parallelPages }, () => generateRandomPage());
            pages.forEach(() => incrementRandomClicks());

            const promises = pages.map(p => scanPage(p, controller.signal));
            const batchResults = await Promise.all(promises);

            if (!runningRef.current || controller.signal.aborted) break;

            for (const r of batchResults) {
                if (!r) continue;
                setScannedCount(prev => prev + 1);
                setResults(prev => [r, ...prev].slice(0, 50));

                if (r.status === 'verified') {
                    setEliminatedCount(prev => prev + 1);
                    trackElimination();
                    // Add to batch buffer
                    eliminatedBufferRef.current.push({ page: r.page, networks: ['ETH', 'BNB'] }); // Turbo only checks these
                    if (eliminatedBufferRef.current.length >= 50) {
                        flushEliminations();
                    }
                } else if (r.status === 'found') {
                    const total = r.balances.reduce((s, b) => s + b.balance, 0);
                    setTotalFoundUsd(prev => prev + total);
                    // Record each find to museum (Supabase)
                    for (const b of r.balances) {
                        recordFoundWallet(r.page, b.address, b.balance, b.symbol);
                    }
                    // Save to found alerts (persisted separately, never trimmed)
                    setFoundAlerts(prev => [r, ...prev]);
                    // Save to localStorage for persistence across sessions
                    const saved = JSON.parse(localStorage.getItem('ukl_turbo_found') || '[]');
                    saved.unshift({
                        page: r.page,
                        balances: r.balances,
                        timestamp: r.timestamp,
                    });
                    localStorage.setItem('ukl_turbo_found', JSON.stringify(saved));
                    // Auto-stop on find — don't miss it!
                    runningRef.current = false;
                    controller.abort();
                    setRunning(false);
                    flushEliminations();
                    return;
                }
            }
        }

        setRunning(false);
        flushEliminations();
    }, [parallelPages, scanPage, flushEliminations]);

    const stopTurbo = useCallback(() => {
        runningRef.current = false;
        abortRef.current?.abort();
        setRunning(false);
    }, []);

    const toggleNetwork = (name: string) => {
        setEnabledNetworks(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const speedOptions: { value: SpeedMode; label: string }[] = [
        { value: 'normal', label: t.turboSpeedNormal },
        { value: 'fast', label: t.turboSpeedFast },
        { value: 'turbo', label: t.turboSpeedTurbo },
    ];

    // Load saved found alerts on mount
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('ukl_turbo_found') || '[]');
            if (saved.length > 0) {
                setFoundAlerts(saved.map((s: any) => ({
                    page: s.page,
                    status: 'found' as const,
                    balances: s.balances,
                    timestamp: s.timestamp,
                })));
            }
        } catch { /* ignore */ }
    }, []);

    const truncatePage = (p: string) =>
        p.length > 24 ? p.slice(0, 10) + '…' + p.slice(-10) : p;

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Zap className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">
                        {t.turboTitle}
                    </h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.turboSubtitle}</p>
                </div>
            </div>

            {/* ⚠️ FOUND ALERTS — persistent, prominent */}
            {foundAlerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    {foundAlerts.map((alert, i) => (
                        <div key={`found-${alert.page}-${alert.timestamp}-${i}`}
                            className="border-2 border-terminal-warning bg-terminal-warning/10 rounded-lg p-4 animate-pulse">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-terminal-warning" />
                                <span className="text-terminal-warning font-bold uppercase tracking-widest text-sm">
                                    ⚠ {t.fundsFound}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {alert.balances.map((b, bi) => (
                                    <div key={bi} className="flex items-center justify-between text-sm font-mono">
                                        <span className="text-gray-400 truncate max-w-[60%]">{b.address}</span>
                                        <span className="text-terminal-warning font-bold">{b.balance.toFixed(6)} {b.symbol}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-terminal-warning/30 flex items-center justify-between">
                                <span className="text-gray-500 text-xs font-mono">
                                    #{truncatePage(alert.page)}
                                </span>
                                <button
                                    onClick={() => navigateToPage(alert.page)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-terminal-warning/20 hover:bg-terminal-warning/40 text-terminal-warning rounded border border-terminal-warning/50 text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    OPEN PAGE
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Config Panel */}
            {!running && (
                <div className="glass-panel border border-white/10 rounded-lg p-6 mb-6 space-y-5">
                    <div className="flex items-center gap-2 text-sm text-gray-400 uppercase tracking-widest mb-2">
                        <Settings2 className="w-4 h-4" /> {t.turboSpeed}
                    </div>

                    {/* Parallel Pages Slider */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest">{t.turboPages}</label>
                        <div className="flex items-center gap-4 mt-2">
                            <input
                                type="range"
                                min={1}
                                max={10}
                                value={parallelPages}
                                onChange={e => setParallelPages(Number(e.target.value))}
                                className="flex-grow accent-yellow-400 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-yellow-400 font-bold text-xl w-8 text-center">{parallelPages}</span>
                        </div>
                    </div>

                    {/* Networks */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest">{t.turboNetworks}</label>
                        <div className="flex gap-3 mt-2">
                            {AVAILABLE_NETWORKS.map(name => (
                                <button
                                    key={name}
                                    onClick={() => toggleNetwork(name)}
                                    className={`px-4 py-2 rounded border text-sm font-bold transition-all ${enabledNetworks.includes(name)
                                        ? 'border-terminal-accent bg-terminal-accent/10 text-terminal-accent'
                                        : 'border-white/10 text-gray-600 hover:border-white/30'
                                        }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Speed */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest">{t.turboSpeed}</label>
                        <div className="flex gap-3 mt-2">
                            {speedOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSpeed(opt.value)}
                                    className={`px-4 py-2 rounded border text-sm font-bold transition-all ${speed === opt.value
                                        ? opt.value === 'turbo'
                                            ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                                            : 'border-terminal-accent bg-terminal-accent/10 text-terminal-accent'
                                        : 'border-white/10 text-gray-600 hover:border-white/30'
                                        }`}
                                >
                                    {opt.value === 'turbo' && '⚡ '}{opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Start/Stop Button */}
            <div className="mb-6">
                {!running ? (
                    <button
                        onClick={runTurbo}
                        disabled={enabledNetworks.length === 0}
                        className="w-full py-4 rounded-lg font-bold uppercase tracking-widest text-lg transition-all bg-yellow-400/10 border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <Play className="w-5 h-5" /> {t.turboStart}
                    </button>
                ) : (
                    <button
                        onClick={stopTurbo}
                        className="w-full py-4 rounded-lg font-bold uppercase tracking-widest text-lg transition-all bg-red-500/10 border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center gap-3 animate-pulse"
                    >
                        <Square className="w-5 h-5" /> {t.turboStop}
                    </button>
                )}
            </div>

            {/* Live Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="glass-panel border border-white/10 rounded-lg p-4 text-center">
                    <Activity className="w-4 h-4 text-terminal-accent mx-auto mb-1" />
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{t.turboScanned}</div>
                    <div className="text-2xl font-bold text-terminal-accent">{scannedCount}</div>
                </div>
                <div className="glass-panel border border-white/10 rounded-lg p-4 text-center">
                    <Trash2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{t.turboEliminated}</div>
                    <div className="text-2xl font-bold text-green-400">{eliminatedCount}</div>
                </div>
                <div className="glass-panel border border-white/10 rounded-lg p-4 text-center">
                    <DollarSign className="w-4 h-4 text-terminal-warning mx-auto mb-1" />
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{t.turboFoundTotal}</div>
                    <div className="text-2xl font-bold text-terminal-warning">${totalFoundUsd.toFixed(2)}</div>
                </div>
                <div className="glass-panel border border-white/10 rounded-lg p-4 text-center">
                    <Gauge className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{t.turboSpeed2}</div>
                    <div className="text-2xl font-bold text-yellow-400">{pagesPerMin} <span className="text-xs text-gray-500">{t.turboPagesMin}</span></div>
                </div>
            </div>

            {/* Status */}
            <div className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">
                {running ? (
                    <span className="text-yellow-400 animate-pulse">⚡ {t.turboRunning}</span>
                ) : scannedCount > 0 ? (
                    <span className="text-green-400">✓ {t.turboCompleted}</span>
                ) : (
                    <span>{t.turboIdle}</span>
                )}
            </div>

            {/* Results Feed */}
            {results.length > 0 && (
                <div className="glass-panel border border-white/10 rounded-lg overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {results.map((r, i) => (
                            <div key={`${r.page}-${r.timestamp}-${i}`}
                                className={`flex items-center justify-between px-4 py-2 text-xs font-mono ${r.status === 'found' ? 'bg-terminal-warning/10' :
                                    r.status === 'verified' ? 'bg-green-500/5' :
                                        'bg-red-500/5'
                                    }`}
                            >
                                {r.status === 'found' ? (
                                    <button
                                        onClick={() => navigateToPage(r.page)}
                                        className="text-terminal-warning hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        #{truncatePage(r.page)}
                                    </button>
                                ) : (
                                    <span className="text-gray-500 truncate max-w-[200px]">
                                        #{truncatePage(r.page)}
                                    </span>
                                )}
                                <span className={`font-bold ${r.status === 'found' ? 'text-terminal-warning animate-pulse' :
                                    r.status === 'verified' ? 'text-green-500' :
                                        'text-red-500'
                                    }`}>
                                    {r.status === 'found' ? `💰 $${r.balances.reduce((s, b) => s + b.balance, 0).toFixed(4)}` :
                                        r.status === 'verified' ? '✓ 0.00' : '✗ ERR'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
