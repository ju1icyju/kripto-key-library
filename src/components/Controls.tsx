import { useState, useEffect } from 'react';
import { Search, Shuffle, ArrowRight, ArrowLeft, MousePointerClick } from 'lucide-react';
import { MAX_PAGE } from '../utils/crypto';
import { incrementRandomClicks } from '../utils/supabase';
import { useLang } from '../utils/i18n';

interface ControlsProps {
    currentPage: string;
    onPageChange: (page: string) => void;
    onRandomClick?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ currentPage, onPageChange, onRandomClick }) => {
    const [inputPage, setInputPage] = useState('');
    const [randomClicks, setRandomClicks] = useState(0);
    const { t } = useLang();

    useEffect(() => {
        const stored = localStorage.getItem('ukl_random_clicks');
        if (stored) setRandomClicks(parseInt(stored));
    }, []);

    const handleRandom = () => {
        // Increment local counter
        const newCount = randomClicks + 1;
        setRandomClicks(newCount);
        localStorage.setItem('ukl_random_clicks', newCount.toString());

        // Increment global counter (fire-and-forget)
        incrementRandomClicks();
        onRandomClick?.();

        // Generate a random page
        const run = () => {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
            const rand = BigInt('0x' + hex);
            const page = (rand % MAX_PAGE) + 1n;
            onPageChange(page.toString());
        };
        run();
    };

    const handlePrev = () => {
        try {
            const current = BigInt(currentPage);
            if (current > 1n) {
                onPageChange((current - 1n).toString());
            }
        } catch { /* ignore */ }
    };

    const handleNext = () => {
        try {
            const current = BigInt(currentPage);
            if (current < MAX_PAGE) {
                onPageChange((current + 1n).toString());
            }
        } catch { /* ignore */ }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!inputPage) return;
            let page = BigInt(inputPage);
            if (page < 1n) page = 1n;
            if (page > MAX_PAGE) page = MAX_PAGE;
            onPageChange(page.toString());
            setInputPage('');
        } catch {
            // ignore invalid input
        }
    };

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 glass-panel p-4 rounded-lg items-center">
                {/* Random Button & Counter */}
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <button
                        onClick={handleRandom}
                        className="flex items-center justify-center gap-2 bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-6 py-3 rounded hover:bg-terminal-accent hover:text-black transition-all font-bold uppercase tracking-wider text-glow-accent whitespace-nowrap"
                    >
                        <Shuffle className="w-4 h-4" /> {t.randomPage}
                    </button>
                    {randomClicks > 0 && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-terminal-dim uppercase tracking-widest opacity-70">
                            <MousePointerClick className="w-3 h-3" />
                            {t.clicks} <span className="text-terminal-accent">{randomClicks}</span>
                        </div>
                    )}
                </div>

                {/* Navigation and Search */}
                <div className="flex-grow flex gap-2 w-full">
                    <button
                        onClick={handlePrev}
                        disabled={currentPage === '1'}
                        className="border border-white/20 text-white px-4 py-3 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t.prevPage}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <form onSubmit={handleSubmit} className="flex-grow flex gap-2 relative">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={inputPage}
                                onChange={(e) => setInputPage(e.target.value)}
                                placeholder={`...`}
                                className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 pl-10 rounded focus:outline-none focus:border-terminal-accent font-mono placeholder-gray-600 transition-colors text-center"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        </div>
                        <button type="submit" className="border border-white/20 text-white px-4 py-3 rounded hover:bg-white/10 transition-colors">
                            {t.goTo}
                        </button>
                    </form>

                    <button
                        onClick={handleNext}
                        disabled={currentPage === MAX_PAGE.toString()}
                        className="border border-white/20 text-white px-4 py-3 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t.nextPage}
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
