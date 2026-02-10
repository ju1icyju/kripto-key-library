import { useMemo, useState, useEffect } from 'react';
import { generateWallet, ROWS_PER_PAGE } from '../utils/crypto';
import { shortenAddress } from '../utils/formatters';
import { ExternalLink, Layers } from 'lucide-react';
import { ScanEffect } from './ScanEffect';
import { checkBalances } from '../utils/api';

interface KeyTableProps {
    pageNumber: string;
}

interface FoundFunds {
    address: string;
    balance: number;
    symbol: string;
}

export const KeyTable: React.FC<KeyTableProps> = ({ pageNumber }) => {
    const [scanKey, setScanKey] = useState(0);
    const [totalFound, setTotalFound] = useState("0.00");
    const [isFound, setIsFound] = useState(false);
    const [foundItems, setFoundItems] = useState<FoundFunds[]>([]);

    // Generate rows for this page
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

    // Real API Check on page load
    useEffect(() => {
        let active = true;
        setTotalFound("0.00");
        setIsFound(false);
        setFoundItems([]);

        // Start scan animation
        setScanKey(prev => prev + 1);

        const runCheck = async () => {
            const ethAddresses = rows.map(r => r.ethAddress);
            // Check real balances
            try {
                const results = await checkBalances(ethAddresses);
                if (!active) return;

                if (results.length > 0) {
                    // Found something!
                    const total = results.reduce((acc, curr) => acc + curr.balance, 0);
                    setTotalFound(total.toFixed(4));
                    setIsFound(true);
                    setFoundItems(results);
                } else {
                    setTotalFound("0.00");
                    setIsFound(false);
                }
            } catch (e) {
                console.error("Verification failed", e);
            }
        };

        // Small delay to let UI allow render before heavy network ops
        const timer = setTimeout(() => {
            runCheck();
        }, 500);

        return () => { active = false; clearTimeout(timer); };
    }, [pageNumber, rows]);

    const getRowBalanceDisplay = (ethAddr: string) => {
        const found = foundItems.find(f => f.address === ethAddr);
        if (found) {
            return (
                <span className="text-terminal-warning font-bold animate-pulse">
                    {found.balance.toFixed(4)} {found.symbol}
                </span>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Dynamic Counter Header */}
            <div className={`flex justify-between items-center bg-terminal-dim/30 border p-3 rounded glass-panel transition-colors duration-500 ${isFound ? 'border-terminal-warning bg-terminal-warning/10' : 'border-white/10'}`}>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Layers className="w-4 h-4" />
                    ОБРАБОТАНО АДРЕСОВ: <span className="text-white font-bold">{rows.length}</span>
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-2">
                    НАЙДЕНО СРЕДСТВ:
                    <span className={`font-bold transition-all duration-500 text-lg ${isFound ? 'text-terminal-warning text-glow-accent animate-pulse' : 'text-terminal-accent text-glow-accent'}`}>
                        {totalFound} USD
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-lg glass-panel">
                <table className="w-full text-left text-xs md:text-sm font-mono">
                    <thead className="bg-black/40 text-gray-400 uppercase tracking-widest border-b border-white/10">
                        <tr>
                            <th className="p-4 w-16 text-center">№</th>
                            <th className="p-4">
                                ПРИВАТНЫЙ КЛЮЧ
                                <div className="text-[10px] text-terminal-dim normal-case opacity-70">(EVM + BTC)</div>
                            </th>
                            <th className="p-4">АДРЕС ETH/BNB</th>
                            <th className="p-4 hidden md:table-cell">АДРЕС BTC</th>
                            <th className="p-4 text-right">БАЛАНС</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, idx) => {
                            const balanceDisplay = getRowBalanceDisplay(row.ethAddress);
                            const isRowFound = !!balanceDisplay;

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
