import { ExternalLink, Fish } from 'lucide-react';
import { useLang } from '../utils/i18n';

interface Whale {
    name: string;
    address: string;
    network: 'ETH' | 'BTC';
    balance: string;
    desc_ru: string;
    desc_en: string;
    explorer: string;
}

const WHALES: Whale[] = [
    {
        name: 'Satoshi Nakamoto',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        network: 'BTC',
        balance: '~72 BTC',
        desc_ru: 'Генезис-блок Bitcoin. Первый адрес в истории крипто. Монеты заблокированы навсегда.',
        desc_en: 'Bitcoin genesis block. The very first crypto address ever. Coins locked forever.',
        explorer: 'https://mempool.space/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    },
    {
        name: 'Binance Cold Wallet',
        address: '0x5a52E96BAcdaBb82fd05763E25335261B270Efcb',
        network: 'ETH',
        balance: '~2M ETH',
        desc_ru: 'Холодный кошелёк крупнейшей биржи. Один из самых \"жирных\" адресов в мире.',
        desc_en: 'Cold wallet of the largest exchange. One of the "fattest" addresses in the world.',
        explorer: 'https://etherscan.io/address/0x5a52E96BAcdaBb82fd05763E25335261B270Efcb',
    },
    {
        name: 'Bitfinex Hacker (2016)',
        address: 'bc1qazcm763858nkj2dz7g0s80vuedj7qwyx583rva',
        network: 'BTC',
        balance: '~94,643 BTC',
        desc_ru: 'Адрес с украденными средствами со взлома Bitfinex. FBI конфисковало часть в 2022.',
        desc_en: 'Address with stolen funds from Bitfinex hack. FBI seized portion in 2022.',
        explorer: 'https://mempool.space/address/bc1qazcm763858nkj2dz7g0s80vuedj7qwyx583rva',
    },
    {
        name: 'Ethereum Foundation',
        address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
        network: 'ETH',
        balance: '~350K ETH',
        desc_ru: 'Основной адрес Ethereum Foundation. Финансирует развитие протокола.',
        desc_en: 'Main Ethereum Foundation address. Funds protocol development.',
        explorer: 'https://etherscan.io/address/0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
    },
    {
        name: 'Wrapped Bitcoin (WBTC)',
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        network: 'ETH',
        balance: '~150K WBTC',
        desc_ru: 'Контракт Wrapped BTC. Хранит BTC, обёрнутые для использования в DeFi.',
        desc_en: 'Wrapped BTC contract. Holds BTC wrapped for use in DeFi protocols.',
        explorer: 'https://etherscan.io/address/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    },
    {
        name: 'MtGox Cold Wallet',
        address: '1Drt3c8pSdrkyjuBiwVcSSixZwQtMZ3Tew',
        network: 'BTC',
        balance: '~137K BTC',
        desc_ru: 'Остатки со взломанной биржи Mt.Gox (2014). Судебный процесс длился 10 лет.',
        desc_en: 'Remnants from hacked Mt.Gox exchange (2014). Legal process lasted 10 years.',
        explorer: 'https://mempool.space/address/1Drt3c8pSdrkyjuBiwVcSSixZwQtMZ3Tew',
    },
    {
        name: 'Vitalik Buterin',
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        network: 'ETH',
        balance: '~240K ETH',
        desc_ru: 'Основной публичный адрес создателя Ethereum. vitalik.eth.',
        desc_en: 'Main public address of Ethereum creator. vitalik.eth.',
        explorer: 'https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    },
    {
        name: 'Bitcoin Pizza Wallet',
        address: '17SkEw2md5avVNyYgj6RiXuQKNwkXaxFyQ',
        network: 'BTC',
        balance: '0 BTC',
        desc_ru: 'Адрес Ласло Хейница, заплатившего 10,000 BTC за 2 пиццы в 2010. Кошелёк давно пуст.',
        desc_en: 'Laszlo Hanyecz\'s address — paid 10,000 BTC for 2 pizzas in 2010. Wallet long empty.',
        explorer: 'https://mempool.space/address/17SkEw2md5avVNyYgj6RiXuQKNwkXaxFyQ',
    },
];

export const WhaleGallery: React.FC = () => {
    const { t, lang } = useLang();

    const truncAddr = (a: string) =>
        a.length > 20 ? a.slice(0, 10) + '…' + a.slice(-8) : a;

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Fish className="w-8 h-8 text-blue-400" />
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-widest text-glow">{t.whalesTitle}</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest">{t.whalesSubtitle}</p>
                </div>
            </div>

            <div className="glass-panel border border-white/10 rounded-lg p-4 mb-6 text-sm text-gray-400">
                <p>{t.whalesDesc}</p>
            </div>

            {/* Cards */}
            <div className="space-y-3">
                {WHALES.map((whale) => (
                    <div key={whale.address} className="glass-panel border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-white">{whale.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${whale.network === 'BTC'
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-blue-500/20 text-blue-400'
                                        }`}>{whale.network}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <code className="text-xs text-terminal-gold font-mono">{truncAddr(whale.address)}</code>
                                    <a href={whale.explorer} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-terminal-accent transition-colors">
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {lang === 'ru' ? whale.desc_ru : whale.desc_en}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-terminal-warning font-bold font-mono text-sm">{whale.balance}</div>
                                <div className="text-[10px] text-gray-600 uppercase">{t.whalesApprox}</div>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <div className="text-[10px] text-gray-600">
                                {t.whalesPageNote}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
