import { useState, useCallback } from 'react';
import { BookOpen, ArrowRight, Key, Hash, Wallet } from 'lucide-react';
import { useLang } from '../utils/i18n';
import { generateWallet } from '../utils/crypto';

export const CryptoGuide: React.FC = () => {
    const { t } = useLang();
    const [step, setStep] = useState(0);
    const [hexInput, setHexInput] = useState('');
    const [liveResult, setLiveResult] = useState<{
        ethAddress: string;
        btcAddress: string;
        privateKey: string;
    } | null>(null);

    const tryGenerate = useCallback((hex: string) => {
        setHexInput(hex);
        if (hex.length < 1 || hex.length > 64) {
            setLiveResult(null);
            return;
        }
        try {
            const padded = hex.padStart(64, '0');
            const pageNum = BigInt('0x' + padded);
            if (pageNum === 0n) {
                setLiveResult(null);
                return;
            }
            // Row 0, Page = pageNum means key = (pageNum - 1) * 128 + 1
            // Instead, we want key = pageNum directly
            // So page = floor((pageNum - 1) / 128) + 1, row = (pageNum - 1) % 128
            const page = ((pageNum - 1n) / 128n + 1n).toString();
            const row = Number((pageNum - 1n) % 128n);
            const w = generateWallet(row, page);
            setLiveResult({
                privateKey: '0x' + padded,
                ethAddress: w.ethAddress,
                btcAddress: w.btcAddress,
            });
        } catch {
            setLiveResult(null);
        }
    }, []);

    const steps = [
        {
            title: t.guideStep1Title,
            desc: t.guideStep1Desc,
            icon: <Key className="w-6 h-6 text-terminal-accent" />,
            visual: (
                <div className="font-mono text-xs md:text-sm text-terminal-accent bg-black/30 p-4 rounded-lg overflow-x-auto">
                    <div className="text-gray-500 text-[10px] mb-1">256-bit random number →</div>
                    <div className="break-all leading-relaxed tracking-wider">
                        <span className="text-yellow-400">e9</span>
                        <span className="text-green-400">87</span>
                        <span className="text-blue-400">15</span>
                        <span className="text-terminal-accent">a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6</span>
                        <span className="text-yellow-400">e7f8</span>
                        <span className="text-green-400">a9b0</span>
                        <span className="text-blue-400">c1d2</span>
                        <span className="text-terminal-accent">e3f4a5b6c7d8</span>
                    </div>
                    <div className="text-gray-500 text-[10px] mt-2">
                        ↑ 64 hex characters = 32 bytes = 256 bits
                    </div>
                </div>
            ),
        },
        {
            title: t.guideStep2Title,
            desc: t.guideStep2Desc,
            icon: <Hash className="w-6 h-6 text-purple-400" />,
            visual: (
                <div className="font-mono text-xs bg-black/30 p-4 rounded-lg space-y-3">
                    <div className="text-gray-400">
                        <span className="text-purple-400">P</span> = <span className="text-yellow-400">k</span> × <span className="text-green-400">G</span>
                    </div>
                    <div className="text-[10px] text-gray-500 space-y-1">
                        <div><span className="text-yellow-400">k</span> — приватный ключ (число)</div>
                        <div><span className="text-green-400">G</span> — генераторная точка secp256k1</div>
                        <div><span className="text-purple-400">P</span> — публичный ключ (точка на кривой)</div>
                    </div>
                    <div className="border-t border-white/10 pt-2 text-gray-500 text-[10px]">
                        y² = x³ + 7 (mod p)
                        <br />
                        p = 2²⁵⁶ - 2³² - 977
                    </div>
                    <div className="text-red-400 text-[10px]">
                        ⚠ P → k невозможно (задача дискретного логарифма)
                    </div>
                </div>
            ),
        },
        {
            title: t.guideStep3Title,
            desc: t.guideStep3Desc,
            icon: <Wallet className="w-6 h-6 text-blue-400" />,
            visual: (
                <div className="font-mono text-xs bg-black/30 p-4 rounded-lg space-y-2">
                    <div className="text-gray-500 text-[10px]">Public Key (65 bytes) →</div>
                    <div className="text-purple-400 break-all text-[10px]">04a1b2c3...f4e5d6</div>
                    <div className="text-gray-500 mt-1">↓ Keccak-256</div>
                    <div className="text-blue-400 break-all text-[10px]">abc123def456...789xyz</div>
                    <div className="text-gray-500 mt-1">↓ Last 20 bytes</div>
                    <div className="text-terminal-accent font-bold">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</div>
                </div>
            ),
        },
        {
            title: t.guideStep4Title,
            desc: t.guideStep4Desc,
            icon: <Wallet className="w-6 h-6 text-orange-400" />,
            visual: (
                <div className="font-mono text-xs bg-black/30 p-4 rounded-lg space-y-2">
                    <div className="text-gray-500 text-[10px]">Public Key →</div>
                    <div className="text-gray-500">↓ SHA-256 → ↓ RIPEMD-160</div>
                    <div className="text-orange-400 text-[10px]">76a914abc123...def456</div>
                    <div className="text-gray-500 mt-1">↓ Bech32 encoding</div>
                    <div className="text-orange-400 font-bold">bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4</div>
                    <div className="text-gray-600 text-[10px] mt-2">Native SegWit (P2WPKH)</div>
                </div>
            ),
        },
    ];

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.guideTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.guideSubtitle}</p>
                </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 mb-6">
                {steps.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`flex-1 h-1.5 rounded-full transition-all ${i === step ? 'bg-terminal-accent' :
                            i < step ? 'bg-terminal-accent/30' : 'bg-white/10'
                            }`}
                    />
                ))}
            </div>

            {/* Current Step */}
            <div className="glass-panel border border-white/10 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    {steps[step].icon}
                    <h3 className="text-lg font-bold text-white">{steps[step].title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{steps[step].desc}</p>
                {steps[step].visual}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mb-8">
                <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="px-4 py-2 border border-white/10 rounded text-sm text-gray-400 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {t.guideBack}
                </button>
                <button
                    onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                    disabled={step === steps.length - 1}
                    className="px-4 py-2 border border-terminal-accent/50 rounded text-sm text-terminal-accent hover:bg-terminal-accent/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    {t.guideNext} <ArrowRight className="w-3 h-3" />
                </button>
            </div>

            {/* Try It Yourself */}
            <div className="glass-panel border border-white/10 rounded-lg p-6">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">{t.guideTryIt}</h3>
                <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">{t.guidePrivKey}</label>
                    <input
                        value={hexInput}
                        onChange={e => tryGenerate(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 64))}
                        placeholder="e.g. 1, a1b2c3, or any hex up to 64 chars"
                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-mono text-sm text-terminal-accent placeholder:text-gray-600 outline-none focus:border-terminal-accent/50"
                    />
                </div>

                {liveResult && (
                    <div className="space-y-2 text-xs font-mono">
                        <div className="text-gray-500">{t.guideResult}</div>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-500 w-12 shrink-0">KEY:</span>
                            <span className="text-terminal-accent break-all">{liveResult.privateKey}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-500 w-12 shrink-0">ETH:</span>
                            <span className="text-blue-400 break-all">{liveResult.ethAddress}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-gray-500 w-12 shrink-0">BTC:</span>
                            <span className="text-orange-400 break-all">{liveResult.btcAddress}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
