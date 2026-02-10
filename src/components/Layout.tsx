import { type ReactNode, useState } from 'react';
import { Terminal, Coffee, Info, Home, Check, Copy } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="min-h-screen relative font-mono flex flex-col crt">
            {/* Header */}
            <header className="border-b border-white/10 p-4 flex justify-between items-center glass-panel sticky top-0 z-50">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.hash = ''}>
                    <Terminal className="w-6 h-6 text-terminal-accent animate-pulse" />
                    <h1 className="text-lg md:text-xl font-bold tracking-widest text-glow hidden md:block">
                        УНИВЕРСАЛЬНАЯ БИБЛИОТЕКА КЛЮЧЕЙ
                    </h1>
                    <h1 className="text-lg font-bold tracking-widest text-glow md:hidden">
                        UKL v2.0
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-xs md:text-sm">
                    <a href="#" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        <Home className="w-4 h-4" /> <span className="hidden md:inline">ГЛАВНАЯ</span>
                    </a>
                    <a href="#about" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        <Info className="w-4 h-4" /> <span className="hidden md:inline">О ПРОЕКТЕ</span>
                    </a>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-2 md:p-6 overflow-x-hidden relative z-10">
                {children}
            </main>

            {/* Footer / Educational Section */}
            <footer className="border-t border-white/10 p-6 mt-8 glass-panel bg-black/20">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">

                    {/* Donations */}
                    <div className="w-full grid md:grid-cols-2 gap-4">
                        {/* BTC */}
                        <div
                            className="p-4 border border-white/10 rounded bg-white/5 flex flex-col gap-2 cursor-pointer hover:bg-white/10 transition-all group relative"
                            onClick={() => handleCopy('bc1qadsttp4jk34cqwmpjjd99ns8aqjk9rhs7rle38', 'btc')}
                        >
                            <div className="flex items-center justify-between text-terminal-gold font-bold text-sm">
                                <div className="flex items-center gap-2"><Coffee className="w-4 h-4" /> DONATE BTC</div>
                                {copied === 'btc' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                            </div>
                            <code className="text-[10px] md:text-xs text-gray-400 break-all select-all">
                                bc1qadsttp4jk34cqwmpjjd99ns8aqjk9rhs7rle38
                            </code>
                            {copied === 'btc' && <span className="absolute -top-2 right-2 text-[10px] bg-green-500 text-black px-1 rounded">COPIED!</span>}
                        </div>

                        {/* ETH */}
                        <div
                            className="p-4 border border-white/10 rounded bg-white/5 flex flex-col gap-2 cursor-pointer hover:bg-white/10 transition-all group relative"
                            onClick={() => handleCopy('0x770279c14A90689466a6e1D8873d4f3e65036B25', 'eth')}
                        >
                            <div className="flex items-center justify-between text-terminal-accent font-bold text-sm">
                                <div className="flex items-center gap-2"><Coffee className="w-4 h-4" /> DONATE ETH</div>
                                {copied === 'eth' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                            </div>
                            <code className="text-[10px] md:text-xs text-gray-400 break-all select-all">
                                0x770279c14A90689466a6e1D8873d4f3e65036B25
                            </code>
                            {copied === 'eth' && <span className="absolute -top-2 right-2 text-[10px] bg-green-500 text-black px-1 rounded">COPIED!</span>}
                        </div>
                    </div>

                    <div className="text-center text-terminal-dim text-xs opacity-50">
                        Universal Key Library v.2.0 // NO LOGS // CLIENT-SIDE ONLY // MATH &gt; LAW
                    </div>
                </div>
            </footer>
        </div>
    );
};
