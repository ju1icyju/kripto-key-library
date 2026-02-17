import { useState } from 'react';
import { Search, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { generateWallet, ROWS_PER_PAGE, MAX_PAGE } from '../utils/crypto';

export const KeyDecoder: React.FC = () => {
    const { t } = useLang();
    const [input, setInput] = useState('');
    const [result, setResult] = useState<{
        page: string;
        row: number;
        privateKey: string;
        ethAddress: string;
        btcAddress: string;
    } | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');

    const decode = () => {
        setError('');
        setResult(null);

        let hex = input.trim();
        // strip 0x prefix
        if (hex.startsWith('0x') || hex.startsWith('0X')) hex = hex.slice(2);

        // Validate hex
        if (!/^[0-9a-fA-F]{1,64}$/.test(hex)) {
            setError(t.decoderErrorFormat);
            return;
        }

        // Pad to 64 chars
        hex = hex.padStart(64, '0');

        try {
            const keyBigInt = BigInt('0x' + hex);
            if (keyBigInt < 1n || keyBigInt > 2n ** 256n - 1n) {
                setError(t.decoderErrorRange);
                return;
            }

            // Reverse formula: page = floor((key-1)/128) + 1, row = (key-1) % 128
            const page = ((keyBigInt - 1n) / ROWS_PER_PAGE) + 1n;
            const row = Number((keyBigInt - 1n) % ROWS_PER_PAGE);

            if (page > MAX_PAGE) {
                setError(t.decoderErrorRange);
                return;
            }

            // Generate wallet from page/row to verify
            const wallet = generateWallet(row, page.toString());

            setResult({
                page: page.toString(),
                row,
                privateKey: wallet.privateKey,
                ethAddress: wallet.ethAddress,
                btcAddress: wallet.btcAddress,
            });
        } catch {
            setError(t.decoderErrorFormat);
        }
    };

    const copyValue = (val: string, label: string) => {
        navigator.clipboard.writeText(val);
        setCopied(label);
        setTimeout(() => setCopied(''), 1500);
    };

    const navigateToPage = (page: string) => {
        window.location.hash = '';
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page } }));
        }, 50);
    };

    const truncate = (s: string, max: number) =>
        s.length > max ? s.slice(0, max / 2) + '…' + s.slice(-max / 2) : s;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Search className="w-8 h-8 text-terminal-accent" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.decoderTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.decoderSubtitle}</p>
                </div>
            </div>

            {/* Input */}
            <div className="glass-panel border border-white/10 rounded-lg p-6 mb-6">
                <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">{t.decoderInputLabel}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && decode()}
                        placeholder="0x0000...0001"
                        maxLength={66}
                        className="flex-grow bg-black/50 border border-white/10 text-terminal-gold font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-terminal-accent transition-colors"
                    />
                    <button
                        onClick={decode}
                        className="bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-6 py-3 rounded hover:bg-terminal-accent hover:text-black transition-all font-bold uppercase tracking-wider"
                    >
                        {t.decoderSearch}
                    </button>
                </div>
                {error && (
                    <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>
                )}
                <p className="text-gray-600 text-[10px] mt-2">{t.decoderHint}</p>
            </div>

            {/* Result */}
            {result && (
                <div className="glass-panel border border-terminal-accent/30 rounded-lg p-6 animate-in fade-in duration-300 space-y-4">
                    {/* Page & Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t.decoderPage}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-terminal-accent font-bold font-mono text-lg break-all">
                                    {result.page.length > 20 ? truncate(result.page, 20) : result.page}
                                </span>
                                <button onClick={() => navigateToPage(result.page)} className="text-gray-500 hover:text-terminal-accent transition-colors" title={t.decoderGoToPage}>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t.decoderRow}</div>
                            <span className="text-terminal-accent font-bold font-mono text-lg">{result.row + 1} / 128</span>
                        </div>
                    </div>

                    <hr className="border-white/5" />

                    {/* Addresses */}
                    {[
                        { label: t.decoderPrivKey, value: result.privateKey, explorer: '' },
                        { label: t.decoderEth, value: result.ethAddress, explorer: `https://etherscan.io/address/${result.ethAddress}` },
                        { label: t.decoderBtc, value: result.btcAddress, explorer: `https://mempool.space/address/${result.btcAddress}` },
                    ].map(item => (
                        <div key={item.label}>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{item.label}</div>
                            <div className="flex items-center gap-2">
                                <code className="text-terminal-gold font-mono text-xs break-all flex-grow">{item.value}</code>
                                <button onClick={() => copyValue(item.value, item.label)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                {item.explorer && (
                                    <a href={item.explorer} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-terminal-accent transition-colors shrink-0">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}

                    {copied && (
                        <div className="text-terminal-accent text-xs text-center animate-pulse">{t.copied}</div>
                    )}
                </div>
            )}
        </div>
    );
};
