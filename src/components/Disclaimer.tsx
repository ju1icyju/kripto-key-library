import { Shield, AlertTriangle, Lock, Info } from 'lucide-react';

export const Disclaimer: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

            {/* Hero Section */}
            <div className="glass-panel p-8 rounded-xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield className="w-32 h-32" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-terminal-accent mb-4 text-glow">
                    УНИВЕРСАЛЬНАЯ БИБЛИОТЕКА КЛЮЧЕЙ
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg">
                    Все возможные приватные ключи (числа от 1 до 2^256) уже существуют в математике.
                    Мы не создаем их — мы просто показываем вам их строковое представление.
                    Эта библиотека — интерактивная демонстрация необъятности криптографического пространства.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Math Section */}
                <div className="glass-panel p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-400" /> Математика Вселенной
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                        Количество возможных ключей (2^256) примерно равно 10^77.
                        Количество атомов в наблюдаемой Вселенной оценивается в 10^80.
                        <br /><br />
                        Найти существующий кошелек с балансом здесь сложнее, чем случайно выбрать один конкретный атом из всей Вселенной.
                        Если вы видите здесь баланс — это либо чудо, либо ошибка симуляции (хотя мы делаем честные проверки!).
                    </p>
                </div>

                {/* Security Section */}
                <div className="glass-panel p-6 rounded-xl border border-terminal-warning/30 bg-terminal-warning/5">
                    <h3 className="text-xl font-bold text-terminal-warning mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Осторожно: Honeypots
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Иногда вы можете найти адрес, на котором лежат токены (USDT, SHIB и т.д.), но нет ETH или BNB для оплаты газа.
                        <br /><br />
                        <strong>ЭТО ЛОВУШКА!</strong>
                        <br /><br />
                        Злоумышленники специально отправляют токены на скомпрометированные адреса.
                        Как только вы отправите туда ETH для оплаты комиссии вывода, бот мгновенно выведет ваш ETH.
                        Никогда не отправляйте средства на найденные ключи.
                    </p>
                </div>
            </div>

            {/* Legal / Privacy */}
            <div className="glass-panel p-6 rounded-xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-400" /> Конфиденциальность и Закон
                </h3>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                    <li>
                        <strong>Server-less:</strong> Весь поиск происходит на клиенте (в вашем браузере). Мы не видим, какие ключи вы просматриваете.
                    </li>
                    <li>
                        <strong>Нет логов:</strong> Сервер выдает только статику и проксирует RPC-запросы. Мы не храним историю ваших действий.
                    </li>
                    <li>
                        <strong>Образовательная цель:</strong> Сайт создан исключительно для демонстрации принципов работы криптографии.
                        Автор не несет ответственности за найденные средства или потерянные комиссии.
                    </li>
                </ul>
            </div>

        </div>
    );
};
