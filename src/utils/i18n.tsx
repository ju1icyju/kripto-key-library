import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const translations = {
    ru: {
        // Layout
        siteName: 'УНИВЕРСАЛЬНАЯ БИБЛИОТЕКА КЛЮЧЕЙ',
        siteNameShort: 'UKL v3.0',
        navHome: 'ГЛАВНАЯ',
        navAbout: 'О ПРОЕКТЕ',
        navStats: 'СТАТИСТИКА',
        eliminatedSectors: 'УТИЛИЗИРОВАНО СЕКТОРОВ:',
        you: 'ВЫ:',
        donateBtc: 'DONATE BTC',
        donateEth: 'DONATE ETH',
        copied: 'COPIED!',
        footer: 'Universal Key Library v.3.0 // NO LOGS // CLIENT-SIDE ONLY // MATH > LAW',

        // Controls
        randomPage: 'СЛУЧАЙНАЯ СТРАНИЦА',
        clicks: 'КЛИКОВ:',
        prevPage: 'Предыдущая страница',
        nextPage: 'Следующая страница',
        goTo: 'ПЕРЕЙТИ',
        currentPage: 'ТЕКУЩАЯ СТРАНИЦА',

        // KeyTable
        addresses: 'АДРЕСОВ:',
        verified: 'VERIFIED',
        networkError: 'ОШИБКА СЕТИ',
        fundsFound: '⚠ ОБНАРУЖЕНЫ СРЕДСТВА',
        scanning: 'СКАНИРОВАНИЕ...',
        error: 'ОШИБКА',
        found: 'НАЙДЕНО:',
        privateKey: 'ПРИВАТНЫЙ КЛЮЧ',
        ethAddress: 'АДРЕС ETH/BNB',
        btcAddress: 'АДРЕС BTC',
        balance: 'БАЛАНС',

        // Stats
        statsTitle: 'СТАТИСТИКА',
        totalRandomClicks: 'Всего нажатий «РАНДОМ»',
        globalAllUsers: 'Глобально, все пользователи',
        eliminatedSectorsTitle: 'Утилизировано секторов',
        foreverRemoved: 'Навсегда вычеркнуты из реестра',
        cleanPercentage: 'Процент очистки',
        ofTotalSectors: 'От общего числа 2²⁵⁶ ÷ 128 секторов',
        fundsFoundTitle: 'Найдено средств',
        totalAllTime: 'Суммарно за всё время',
        perspective: 'Перспектива',
        loadingData: 'ЗАГРУЗКА ДАННЫХ...',
        funFact1: (
            'Всего существует <b>~9 × 10⁷⁴</b> секторов. ' +
            'Если все 8 миллиардов людей будут нажимать «Рандом» каждую секунду в течение ' +
            '<b class="text-terminal-accent">миллиона лет</b>, они проверят лишь ' +
            '<b class="text-terminal-warning">0.000000000000000000000000000000000000000001%</b> всех секторов.'
        ),
        funFact2: (
            'Вероятность найти кошелёк с балансом: <b>1 к 10⁵⁰</b>. ' +
            'Это как выиграть в лотерею <b class="text-terminal-warning">7 раз подряд</b>.'
        ),

        // Disclaimer
        disclaimerTitle: 'УНИВЕРСАЛЬНАЯ БИБЛИОТЕКА КЛЮЧЕЙ',
        disclaimerIntro: 'Все возможные приватные ключи (числа от 1 до 2^256) уже существуют в математике. Мы не создаем их — мы просто показываем вам их строковое представление. Эта библиотека — интерактивная демонстрация необъятности криптографического пространства.',
        mathTitle: 'Математика Вселенной',
        mathText: 'Количество возможных ключей (2^256) примерно равно 10^77. Количество атомов в наблюдаемой Вселенной оценивается в 10^80.<br/><br/>Найти существующий кошелек с балансом здесь сложнее, чем случайно выбрать один конкретный атом из всей Вселенной. Если вы видите здесь баланс — это либо чудо, либо ошибка симуляции (хотя мы делаем честные проверки!).',
        honeypotTitle: 'Осторожно: Honeypots',
        honeypotText: 'Иногда вы можете найти адрес, на котором лежат токены (USDT, SHIB и т.д.), но нет ETH или BNB для оплаты газа.<br/><br/><strong>ЭТО ЛОВУШКА!</strong><br/><br/>Злоумышленники специально отправляют токены на скомпрометированные адреса. Как только вы отправите туда ETH для оплаты комиссии вывода, бот мгновенно выведет ваш ETH. Никогда не отправляйте средства на найденные ключи.',
        privacyTitle: 'Конфиденциальность и Закон',
        privacyServerless: '<strong>Server-less:</strong> Весь поиск происходит на клиенте (в вашем браузере). Мы не видим, какие ключи вы просматриваете.',
        privacyNoLogs: '<strong>Нет логов:</strong> Сервер выдает только статику и проксирует RPC-запросы. Мы не храним историю ваших действий.',
        privacyEducational: '<strong>Образовательная цель:</strong> Сайт создан исключительно для демонстрации принципов работы криптографии. Автор не несет ответственности за найденные средства или потерянные комиссии.',

        // TerminalAlert
        sectorEliminated: 'СЕКТОР НАВСЕГДА УДАЛЁН ИЗ РЕЕСТРА',

        // Turbo
        turbo: '⚡ ТУРБО',
        turboTitle: 'ТУРБО-СКАНЕР',
        turboSubtitle: 'Массовое сканирование страниц',
        turboPages: 'Страниц параллельно',
        turboNetworks: 'Сети для проверки',
        turboSpeed: 'Скорость',
        turboSpeedNormal: 'Обычная',
        turboSpeedFast: 'Быстрая',
        turboSpeedTurbo: 'ТУРБО',
        turboStart: 'ЗАПУСТИТЬ СКАНЕР',
        turboStop: 'ОСТАНОВИТЬ',
        turboScanned: 'Просканировано',
        turboEliminated: 'Утилизировано',
        turboFoundTotal: 'Найдено',
        turboSpeed2: 'Скорость',
        turboPagesMin: 'стр/мин',
        turboRunning: 'Сканирование...',
        turboIdle: 'Ожидание запуска',
        turboCompleted: 'Завершено',

        // SEO
        pageTitle: 'Универсальная Библиотека Ключей — Поиск приватных ключей Bitcoin и Ethereum',
    },
    en: {
        // Layout
        siteName: 'UNIVERSAL KEY LIBRARY',
        siteNameShort: 'UKL v3.0',
        navHome: 'HOME',
        navAbout: 'ABOUT',
        navStats: 'STATS',
        eliminatedSectors: 'SECTORS ELIMINATED:',
        you: 'YOU:',
        donateBtc: 'DONATE BTC',
        donateEth: 'DONATE ETH',
        copied: 'COPIED!',
        footer: 'Universal Key Library v.3.0 // NO LOGS // CLIENT-SIDE ONLY // MATH > LAW',

        // Controls
        randomPage: 'RANDOM PAGE',
        clicks: 'CLICKS:',
        prevPage: 'Previous page',
        nextPage: 'Next page',
        goTo: 'GO TO',
        currentPage: 'CURRENT PAGE',

        // KeyTable
        addresses: 'ADDRESSES:',
        verified: 'VERIFIED',
        networkError: 'NETWORK ERROR',
        fundsFound: '⚠ FUNDS DETECTED',
        scanning: 'SCANNING...',
        error: 'ERROR',
        found: 'FOUND:',
        privateKey: 'PRIVATE KEY',
        ethAddress: 'ETH/BNB ADDRESS',
        btcAddress: 'BTC ADDRESS',
        balance: 'BALANCE',

        // Stats
        statsTitle: 'STATISTICS',
        totalRandomClicks: 'Total "RANDOM" clicks',
        globalAllUsers: 'Global, all users combined',
        eliminatedSectorsTitle: 'Sectors eliminated',
        foreverRemoved: 'Permanently removed from the registry',
        cleanPercentage: 'Cleanup percentage',
        ofTotalSectors: 'Of total 2²⁵⁶ ÷ 128 sectors',
        fundsFoundTitle: 'Funds found',
        totalAllTime: 'Total of all time',
        perspective: 'Perspective',
        loadingData: 'LOADING DATA...',
        funFact1: (
            'There are <b>~9 × 10⁷⁴</b> total sectors. ' +
            'If all 8 billion people clicked "Random" every second for ' +
            '<b class="text-terminal-accent">a million years</b>, they would check only ' +
            '<b class="text-terminal-warning">0.000000000000000000000000000000000000000001%</b> of all sectors.'
        ),
        funFact2: (
            'Probability of finding a wallet with balance: <b>1 in 10⁵⁰</b>. ' +
            'That\'s like winning the lottery <b class="text-terminal-warning">7 times in a row</b>.'
        ),

        // Disclaimer
        disclaimerTitle: 'UNIVERSAL KEY LIBRARY',
        disclaimerIntro: 'All possible private keys (numbers from 1 to 2^256) already exist in mathematics. We don\'t create them — we simply display their string representation. This library is an interactive demonstration of the vastness of cryptographic space.',
        mathTitle: 'Mathematics of the Universe',
        mathText: 'The number of possible keys (2^256) is approximately 10^77. The number of atoms in the observable universe is estimated at 10^80.<br/><br/>Finding an existing wallet with a balance here is harder than randomly picking one specific atom from the entire universe. If you see a balance here — it\'s either a miracle or a simulation error (though we do honest checks!).',
        honeypotTitle: 'Beware: Honeypots',
        honeypotText: 'Sometimes you may find an address holding tokens (USDT, SHIB, etc.) but no ETH or BNB for gas fees.<br/><br/><strong>IT\'S A TRAP!</strong><br/><br/>Attackers deliberately send tokens to compromised addresses. As soon as you send ETH there to pay withdrawal fees, a bot will instantly drain your ETH. Never send funds to discovered keys.',
        privacyTitle: 'Privacy & Legal',
        privacyServerless: '<strong>Server-less:</strong> All searching happens client-side (in your browser). We cannot see which keys you view.',
        privacyNoLogs: '<strong>No logs:</strong> The server only serves static files and proxies RPC requests. We do not store your activity history.',
        privacyEducational: '<strong>Educational purpose:</strong> This site is created solely to demonstrate cryptography principles. The author bears no responsibility for found funds or lost fees.',

        // TerminalAlert
        sectorEliminated: 'SECTOR PERMANENTLY REMOVED FROM REGISTRY',

        // Turbo
        turbo: '⚡ TURBO',
        turboTitle: 'TURBO SCANNER',
        turboSubtitle: 'Mass page scanning',
        turboPages: 'Parallel pages',
        turboNetworks: 'Networks to check',
        turboSpeed: 'Speed',
        turboSpeedNormal: 'Normal',
        turboSpeedFast: 'Fast',
        turboSpeedTurbo: 'TURBO',
        turboStart: 'START SCANNER',
        turboStop: 'STOP',
        turboScanned: 'Scanned',
        turboEliminated: 'Eliminated',
        turboFoundTotal: 'Found',
        turboSpeed2: 'Speed',
        turboPagesMin: 'pg/min',
        turboRunning: 'Scanning...',
        turboIdle: 'Waiting to start',
        turboCompleted: 'Completed',

        // SEO
        pageTitle: 'Universal Key Library — Search Bitcoin & Ethereum Private Keys',
    },
};

type TranslationKeys = keyof typeof translations['en'];
export type Translations = Record<TranslationKeys, string>;

interface LangContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: Translations;
}

const LangContext = createContext<LangContextType>({
    lang: 'ru',
    setLang: () => { },
    t: translations.ru,
});

const detectLang = (): Lang => {
    // 1. Check localStorage
    const stored = localStorage.getItem('ukl_lang') as Lang | null;
    if (stored === 'ru' || stored === 'en') return stored;

    // 2. Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ru')) return 'ru';

    return 'en';
};

export const LangProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Lang>(detectLang);

    const setLang = (newLang: Lang) => {
        setLangState(newLang);
        localStorage.setItem('ukl_lang', newLang);
        document.documentElement.lang = newLang;
        document.title = translations[newLang].pageTitle;
    };

    // Set on mount
    useEffect(() => {
        document.documentElement.lang = lang;
        document.title = translations[lang].pageTitle;
    }, []);

    const t = translations[lang];

    return (
        <LangContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LangContext.Provider>
    );
};

export const useLang = () => useContext(LangContext);
