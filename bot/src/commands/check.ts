import TelegramBot from 'node-telegram-bot-api';
import { generateWallet, ROWS_PER_PAGE, MAX_PAGE } from '../utils/crypto.js';
import { checkBalances } from '../utils/api.js';
import { recordEliminated } from '../utils/supabase.js';

const truncate = (s: string, len: number) =>
    s.length > len ? s.slice(0, len / 2) + '…' + s.slice(-len / 2) : s;

export const handleCheck = async (bot: TelegramBot, chatId: number, pageStr: string) => {
    // Validate page number
    let page: bigint;
    try {
        page = BigInt(pageStr);
        if (page < 1n || page > MAX_PAGE) {
            await bot.sendMessage(chatId, `❌ Номер страницы должен быть от 1 до ~9×10⁷⁴`);
            return;
        }
    } catch {
        await bot.sendMessage(chatId, `❌ Неверный формат номера страницы. Используйте: /check 12345`);
        return;
    }

    const msg = await bot.sendMessage(chatId,
        `🔍 *Проверка страницы* \`#${truncate(pageStr, 20)}\`\n\n⏳ Генерация и проверка...`,
        { parse_mode: 'Markdown' }
    );

    const ethAddresses: string[] = [];
    const wallets: Array<{ privateKey: string; ethAddress: string; btcAddress: string }> = [];

    for (let i = 0; i < Number(ROWS_PER_PAGE); i++) {
        try {
            const w = generateWallet(i, pageStr);
            ethAddresses.push(w.ethAddress);
            wallets.push(w);
        } catch { /* skip */ }
    }

    const result = await checkBalances(ethAddresses);

    let text: string;

    if (result.balances.length > 0) {
        const lines = result.balances.map(b =>
            `💰 *${b.balance.toFixed(6)} ${b.symbol}*\n   🔑 \`${truncate(b.address, 16)}\``
        );
        text = `🚨 *ОБНАРУЖЕНЫ СРЕДСТВА!*\n\n📄 Страница: \`#${truncate(pageStr, 20)}\`\n\n` +
            lines.join('\n\n');
    } else if (result.allVerified) {
        await recordEliminated(pageStr, result.networksVerified);
        text = `✅ *Чисто!*\n\n📄 Страница: \`#${truncate(pageStr, 20)}\`\n🔑 Ключей: ${wallets.length}\n🌐 Сети: ${result.networksVerified.join(', ')}\n💰 $0.00\n\n♻️ Сектор утилизирован`;
    } else {
        text = `⚠️ *Частичная проверка*\n\n📄 \`#${truncate(pageStr, 20)}\`\n❌ Ошибки: ${result.errors.join(', ')}`;
    }

    await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
    });
};
