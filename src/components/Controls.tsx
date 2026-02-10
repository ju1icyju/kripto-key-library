import { useState } from 'react';
import { Search, Shuffle, ArrowRight } from 'lucide-react';
import { MAX_PAGE } from '../utils/crypto';

interface ControlsProps {
    currentPage: string;
    onPageChange: (page: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({ currentPage, onPageChange }) => {
    const [inputPage, setInputPage] = useState('');

    const handleRandom = () => {
        // Generate a random page between 1 and MAX_PAGE (approx 10^77)
        // Since Math.random is not enough for 2^256, we'll use a trick.
        // We want a large random BigInt.
        // Let's generate 32 random bytes and mod by MAX_PAGE.

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!inputPage) return;
            // Allow hex input if starts with 0x
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
        <div className="flex flex-col md:flex-row gap-4 mb-6 glass-panel p-4 rounded-lg">
            <button
                onClick={handleRandom}
                className="flex items-center justify-center gap-2 bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-6 py-3 rounded hover:bg-terminal-accent hover:text-black transition-all font-bold uppercase tracking-wider text-glow-accent"
            >
                <Shuffle className="w-4 h-4" /> СЛУЧАЙНАЯ СТРАНИЦА
            </button>

            <form onSubmit={handleSubmit} className="flex-grow flex gap-2">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        placeholder={`ПЕРЕЙТИ К СТРАНИЦЕ (ТЕКУЩАЯ: ${currentPage})`}
                        className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 pl-10 rounded focus:outline-none focus:border-terminal-accent font-mono placeholder-gray-600 transition-colors"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                <button type="submit" className="border border-white/20 text-white px-6 py-3 rounded hover:bg-white/10 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
