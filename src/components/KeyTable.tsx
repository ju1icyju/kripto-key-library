import { useMemo, useState, useEffect, useRef } from 'react';
import { generateWallet, ROWS_PER_PAGE } from '../utils/crypto';
import { shortenAddress } from '../utils/formatters';
import { ExternalLink, Layers, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ScanEffect } from './ScanEffect';
import { checkBalances, type CheckResult, type BalanceResult } from '../utils/api';
import { recordEliminated, recordFoundWallet } from '../utils/supabase';
import { useLang } from '../utils/i18n';

interface KeyTableProps {
    pageNumber: string;
    onEliminated?: (pageNumber: string) => void;
}

type VerificationStatus = 'pending' | 'verified' | 'error' | 'found';

export const KeyTable: React.FC<KeyTableProps> = ({ pageNumber, onEliminated }) => {
    const [scanKey, setScanKey] = useState(0);
    const [totalFound, setTotalFound] = useState("0.00");
    const [isFound, setIsFound] = useState(false);
    const [foundItems, setFoundItems] = useState<BalanceResult[]>([]);
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
    const [errorMessages, setErrorMessages] = useState<string[]>([]);
    const abortRef = useRef<AbortController | null>(null);
    const { t } = useLang();

    const rows = useMemo(() => {
        const data = [];
        for (let i = 0; i < Number(ROWS_PER_PAGE); i++) {
            try {
                data.push(generateWallet(i, pageNumber));
            } catch (e) {
                console.error(e);
            }
        }
        return data;
    }, [pageNumber]);

    useEffect(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setTotalFound("0.00");
        setIsFound(false);
        setFoundItems([]);
        setVerificationStatus('pending');
        setErrorMessages([]);
        setScanKey(prev => prev + 1);

        const runCheck = async () => {
            const ethAddresses = rows.map(r => r.ethAddress);

            try {
                const result: CheckResult = await checkBalances(ethAddresses, controller.signal);

                if (result.aborted || controller.signal.aborted) return;

                if (result.balances.length > 0) {
                    const total = result.balances.reduce((acc, curr) => acc + curr.balance, 0);
                    setTotalFound(total.toFixed(4));
                    setIsFound(true);
                    setFoundItems(result.balances);
                    setVerificationStatus('found');
                    // Record each find to museum
                    for (const b of result.balances) {
                        recordFoundWallet(pageNumber, b.address, b.balance, b.symbol);
                    }
                } else if (result.allVerified) {
                    setTotalFound("0.00");
                    setIsFound(false);
                    setVerificationStatus('verified');

                    const success = await recordEliminated(pageNumber, result.networksVerified);
                    if (success && onEliminated) {
                        onEliminated(pageNumber);
                    }
                } else {
                    setTotalFound("?");
                    setIsFound(false);
                    setVerificationStatus('error');
                    setErrorMessages(result.errors);
                }
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error("Verification failed", e);
                setVerificationStatus('error');
                setErrorMessages([e.message]);
            }
        };

        const timer = setTimeout(() => {
            runCheck();
        }, 300);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [pageNumber, rows]);

    const getRowBalanceDisplay = (ethAddr: string) => {
        const found = foundItems.find(f => f.address === ethAddr);
        if (found) {
            return (
                <span className="text-terminal-warning font-bold animate-pulse">
                    {found.balance.toFixed(6)} {found.symbol}
                </span>
            );
        }

        if (verificationStatus === 'verified') {
            return (
                <span className="flex items-center justify-end gap-1 text-green-500/70">
                    <span>0.00</span>
                    <ShieldCheck className="w-3 h-3" />
                </span>
            );
        }

        if (verificationStatus === 'error') {
            return (
                <span className="flex items-center justify-end gap-1 text-red-500 font-bold">
                    {t.error}
                    <ShieldAlert className="w-3 h-3" />
                </span>
            );
        }

        return null;
    };

    const statusBadge = () => {
        if (verificationStatus === 'verified') {
            return (
                <span className="flex items-center gap-1 text-green-500 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" /> {t.verified}
                </span>
            );
        }
        if (verificationStatus === 'error') {
            return (
                <span className="flex items-center gap-1 text-red-500 text-xs font-bold" title={errorMessages.join(', ')}>
                    <ShieldAlert className="w-4 h-4" /> {t.networkError}
                </span>
            );
        }
        if (verificationStatus === 'found') {
            return (
                <span className="flex items-center gap-1 text-terminal-warning text-xs font-bold animate-pulse">
                    {t.fundsFound}
                </span>
            );
        }
        return (
            <span className="text-gray-500 text-xs animate-pulse">{t.scanning}</span>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-terminal-dim/30 border p-3 rounded glass-panel transition-colors duration-500 ${verificationStatus === 'found' ? 'border-terminal-warning bg-terminal-warning/10' :
                verificationStatus === 'verified' ? 'border-green-500/30 bg-green-500/5' :
                    verificationStatus === 'error' ? 'border-red-500/30 bg-red-500/5' :
                        'border-white/10'
                }`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Layers className="w-4 h-4" />
                        {t.addresses} <span className="text-white font-bold">{rows.length}</span>
                    </div>
                    {statusBadge()}
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                    {t.found}
                    <span className={`font-bold transition-all duration-500 text-lg ${isFound ? 'text-terminal-warning text-glow-accent animate-pulse' : verificationStatus === 'error' ? 'text-red-500' : 'text-terminal-accent text-glow-accent'}`}>
                        {totalFound} {verificationStatus !== 'error' ? 'USD' : ''}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-lg glass-panel">
                <table className="w-full text-left text-xs md:text-sm font-mono">
                    <thead className="bg-black/40 text-gray-400 uppercase tracking-widest border-b border-white/10">
                        <tr>
                            <th className="p-4 w-16 text-center">№</th>
                            <th className="p-4">
                                {t.privateKey}
                                <div className="text-[10px] text-terminal-dim normal-case opacity-70">(EVM + BTC)</div>
                            </th>
                            <th className="p-4">{t.ethAddress}</th>
                            <th className="p-4 hidden md:table-cell">{t.btcAddress}</th>
                            <th className="p-4 text-right">{t.balance}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, idx) => {
                            const balanceDisplay = getRowBalanceDisplay(row.ethAddress);
                            const isRowFound = foundItems.some(f => f.address === row.ethAddress);

                            return (
                                <tr key={row.privateKey} className={`hover:bg-white/5 transition-colors group ${isRowFound ? 'bg-terminal-warning/20' : ''}`}>
                                    <td className="p-4 text-center text-gray-600">{idx + 1}</td>
                                    <td className="p-4 text-terminal-gold font-bold truncate max-w-[150px] md:max-w-none relative group-hover:text-white cursor-pointer transition-colors" title={row.privateKey}>
                                        <span className="md:hidden">{shortenAddress(row.privateKey, 6)}</span>
                                        <span className="hidden md:inline opacity-80">{row.privateKey}</span>
                                    </td>
                                    <td className="p-4 text-terminal-accent">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`https://etherscan.io/address/${row.ethAddress}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline flex items-center gap-1 hover:text-white transition-colors"
                                            >
                                                {shortenAddress(row.ethAddress, 6)}
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="p-4 text-terminal-accent hidden md:table-cell">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`https://mempool.space/address/${row.btcAddress}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline flex items-center gap-1 hover:text-white transition-colors"
                                            >
                                                {shortenAddress(row.btcAddress, 6)}
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono">
                                        {balanceDisplay ? (
                                            balanceDisplay
                                        ) : (
                                            <ScanEffect key={`${scanKey}-${idx}`} duration={1000 + Math.random() * 2000} />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
