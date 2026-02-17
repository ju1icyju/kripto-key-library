import { useState } from 'react';
import { ArrowRightLeft, Copy, Check } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { ethers } from 'ethers';

type UnitType = 'wei' | 'gwei' | 'eth' | 'sats' | 'btc';

const UNITS: { id: UnitType; label: string; placeholder: string }[] = [
    { id: 'eth', label: 'Ether (ETH)', placeholder: '1.0' },
    { id: 'gwei', label: 'Gwei', placeholder: '1000000000' },
    { id: 'wei', label: 'Wei', placeholder: '1000000000000000000' },
    { id: 'btc', label: 'Bitcoin (BTC)', placeholder: '1.0' },
    { id: 'sats', label: 'Satoshi (sats)', placeholder: '100000000' },
];

export const Converter: React.FC = () => {
    const { t } = useLang();
    const [values, setValues] = useState<Record<UnitType, string>>({
        wei: '',
        gwei: '',
        eth: '',
        sats: '',
        btc: '',
    });
    const [copied, setCopied] = useState<UnitType | null>(null);

    const updateValues = (source: UnitType, val: string) => {
        // Allow decimals and empty
        if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

        const newValues = { ...values, [source]: val };

        if (!val) {
            setValues({ wei: '', gwei: '', eth: '', sats: '', btc: '' });
            return;
        }

        try {
            if (source === 'eth') {
                const wei = ethers.parseUnits(val, 18);
                newValues.wei = wei.toString();
                newValues.gwei = ethers.formatUnits(wei, 9);
                // BTC approximation (1 BTC = 1 ETH for purely unit logic? No, separate chains)
                // Actually, converter usually assumes 1 ETH input -> what is it in Wei?
                // But users might want to convert 1 ETH to BTC based on price?
                // No, standard unit converter is strictly within-chain (Wei<->Eth, Sats<->BTC).
                // Let's keep chains separate but parallel for utility.
            } else if (source === 'gwei') {
                const wei = ethers.parseUnits(val, 9);
                newValues.wei = wei.toString();
                newValues.eth = ethers.formatUnits(wei, 18);
            } else if (source === 'wei') {
                const wei = BigInt(val); // might throw if empty/invalid
                newValues.gwei = ethers.formatUnits(wei, 9);
                newValues.eth = ethers.formatUnits(wei, 18);
            } else if (source === 'btc') {
                // 1 BTC = 10^8 Sats
                const sats = Math.round(parseFloat(val) * 1e8);
                newValues.sats = isNaN(sats) ? '' : sats.toString();
            } else if (source === 'sats') {
                const btc = parseFloat(val) / 1e8;
                newValues.btc = isNaN(btc) ? '' : btc.toFixed(8).replace(/\.?0+$/, '');
            }
        } catch (e) {
            // ignore parse errors while typing
            console.debug(e);
        }

        setValues(newValues);
    };

    const copyToClipboard = (unit: UnitType) => {
        if (!values[unit]) return;
        navigator.clipboard.writeText(values[unit]);
        setCopied(unit);
        setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div className="max-w-xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <ArrowRightLeft className="w-8 h-8 text-terminal-accent" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.converterTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.converterSubtitle}</p>
                </div>
            </div>

            <div className="glass-panel border border-white/10 rounded-lg p-6 space-y-6">

                {/* ETH Section */}
                <div>
                    <h3 className="text-xs text-blue-400 uppercase tracking-widest mb-3 font-bold border-b border-blue-500/20 pb-2">
                        Ethereum Units
                    </h3>
                    <div className="space-y-4">
                        {UNITS.filter(u => ['eth', 'gwei', 'wei'].includes(u.id)).map(unit => (
                            <div key={unit.id} className="relative group">
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1">{unit.label}</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={values[unit.id]}
                                        onChange={e => updateValues(unit.id, e.target.value)}
                                        placeholder={unit.placeholder}
                                        className="w-full bg-black/50 border border-white/10 text-terminal-gold font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-terminal-accent transition-colors"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(unit.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        title={t.copied}
                                    >
                                        {copied === unit.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BTC Section */}
                <div>
                    <h3 className="text-xs text-orange-400 uppercase tracking-widest mb-3 font-bold border-b border-orange-500/20 pb-2">
                        Bitcoin Units
                    </h3>
                    <div className="space-y-4">
                        {UNITS.filter(u => ['btc', 'sats'].includes(u.id)).map(unit => (
                            <div key={unit.id} className="relative group">
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 ml-1">{unit.label}</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={values[unit.id]}
                                        onChange={e => updateValues(unit.id, e.target.value)}
                                        placeholder={unit.placeholder}
                                        className="w-full bg-black/50 border border-white/10 text-terminal-gold font-mono text-sm px-4 py-3 rounded focus:outline-none focus:border-terminal-accent transition-colors"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(unit.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        title={t.copied}
                                    >
                                        {copied === unit.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Text */}
                <div className="text-[10px] text-gray-600 mt-4 leading-relaxed">
                    <p>1 ETH = 10⁹ Gwei = 10¹⁸ Wei</p>
                    <p>1 BTC = 10⁸ Satoshi (sats)</p>
                </div>
            </div>
        </div>
    );
};
