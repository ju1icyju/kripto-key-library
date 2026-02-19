import { useState, useMemo } from 'react';
import { Calculator, Users, Cpu, User } from 'lucide-react';
import { useLang } from '../utils/i18n';

// Total key space ≈ 2^256 / 128 pages — use log math for calculations

// Estimated funded addresses on all chains (very generous upper bound)
const FUNDED_ADDRESSES = 500_000_000; // 500M

export const ProbabilityCalc: React.FC = () => {
    const { t } = useLang();
    const [people, setPeople] = useState(1);
    const [pagesPerSec, setPagesPerSec] = useState(10);
    const [years, setYears] = useState(100);

    const results = useMemo(() => {
        const secondsPerYear = 365.25 * 24 * 3600;
        const totalPagesChecked = people * pagesPerSec * secondsPerYear * years;
        const totalKeysChecked = totalPagesChecked * 128;

        // Log-based calculations to handle huge numbers
        const logTotalKeys = Math.log10(totalKeysChecked);
        const logTotalSpace = 256 * Math.log10(2); // ~77.06

        const logPercentage = logTotalKeys - logTotalSpace + 2; // +2 for *100%
        const percentageStr = logPercentage < -50
            ? `10^${logPercentage.toFixed(1)}%`
            : logPercentage < 0
                ? `${Math.pow(10, logPercentage).toExponential(2)}%`
                : `${Math.pow(10, logPercentage).toFixed(2)}%`;

        // Probability of hitting a funded address
        // P = 1 - (1 - FUNDED/2^256)^totalKeysChecked ≈ totalKeysChecked * FUNDED / 2^256
        const logProbability = logTotalKeys + Math.log10(FUNDED_ADDRESSES) - logTotalSpace;
        const probabilityStr = logProbability < -50
            ? `10^${logProbability.toFixed(1)}`
            : logProbability < 0
                ? Math.pow(10, logProbability).toExponential(2)
                : '>99.9%';

        // Fun comparison: how many universes to search
        const atomsInUniverse = 80; // 10^80 atoms
        const comparison = logTotalSpace - logTotalKeys;

        return {
            totalKeysChecked: totalKeysChecked.toExponential(2),
            percentageStr,
            probabilityStr,
            logTotalKeys,
            comparison,
            atomsInUniverse,
        };
    }, [people, pagesPerSec, years]);

    const comparisonText = useMemo(() => {
        const { comparison, atomsInUniverse } = results;
        if (comparison > atomsInUniverse) {
            return t.calcCompInfinity;
        } else if (comparison > 50) {
            const universes = Math.pow(10, comparison - atomsInUniverse);
            return t.calcCompUniverses.replace('{n}', universes.toExponential(1));
        } else if (comparison > 20) {
            return t.calcCompSand.replace('{n}', comparison.toFixed(0));
        } else if (comparison > 10) {
            return t.calcCompPeople.replace('{n}', comparison.toFixed(0));
        } else {
            return t.calcCompNear;
        }
    }, [results, t]);

    const presets = [
        { label: t.calcPreset1, icon: <User className="w-3 h-3" />, people: 1, speed: 10, years: 100 },
        { label: t.calcPreset2, icon: <Users className="w-3 h-3" />, people: 8_000_000_000, speed: 10, years: 1000 },
        { label: t.calcPreset3, icon: <Cpu className="w-3 h-3" />, people: 5_000_000_000, speed: 1_000_000, years: 1_000_000_000 },
    ];

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-8 h-8 text-yellow-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.calcTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.calcSubtitle}</p>
                </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-6">
                {presets.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => { setPeople(p.people); setPagesPerSec(p.speed); setYears(p.years); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded text-xs text-gray-400 hover:text-white hover:border-terminal-accent/50 transition-all"
                    >
                        {p.icon} {p.label}
                    </button>
                ))}
            </div>

            {/* Inputs */}
            <div className="glass-panel border border-white/10 rounded-lg p-6 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">{t.calcPeople}</label>
                        <input
                            type="number"
                            min={1}
                            value={people}
                            onChange={e => setPeople(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-mono text-sm text-terminal-accent outline-none focus:border-terminal-accent/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">{t.calcSpeed}</label>
                        <input
                            type="number"
                            min={1}
                            value={pagesPerSec}
                            onChange={e => setPagesPerSec(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-mono text-sm text-terminal-accent outline-none focus:border-terminal-accent/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">{t.calcYears}</label>
                        <input
                            type="number"
                            min={1}
                            value={years}
                            onChange={e => setYears(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 font-mono text-sm text-terminal-accent outline-none focus:border-terminal-accent/50"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
                {/* Keys checked */}
                <div className="glass-panel border border-white/10 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">🔑 {t.calcKeysChecked}</div>
                    <div className="text-xl font-bold font-mono text-terminal-accent">{results.totalKeysChecked}</div>
                </div>

                {/* Space explored */}
                <div className="glass-panel border border-white/10 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t.calcResult}</div>
                    <div className="text-xl font-bold font-mono text-yellow-400">{results.percentageStr}</div>
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-yellow-400/30 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0.5, Math.pow(10, results.logTotalKeys - 75 + 2)))}%` }}
                        />
                    </div>
                </div>

                {/* Probability */}
                <div className="glass-panel border border-white/10 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t.calcProbability}</div>
                    <div className="text-xl font-bold font-mono text-red-400">{results.probabilityStr}</div>
                </div>

                {/* Comparison */}
                <div className="glass-panel border border-terminal-accent/20 bg-terminal-accent/5 rounded-lg p-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t.calcComparison}</div>
                    <div className="text-lg font-bold text-white">{comparisonText}</div>
                </div>

                {/* Educational context */}
                <div className="text-center text-xs text-gray-600 mt-4 space-y-1">
                    <div>2²⁵⁶ ≈ 1.16 × 10⁷⁷ possible keys</div>
                    <div>~{(FUNDED_ADDRESSES / 1e6).toFixed(0)}M funded addresses across all chains</div>
                    <div>Age of universe ≈ 13.8 × 10⁹ years</div>
                </div>
            </div>
        </div>
    );
};
