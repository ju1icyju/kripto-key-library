import TelegramBot from 'node-telegram-bot-api';
import { generateWallet, generateRandomPage, ROWS_PER_PAGE } from '../utils/crypto.js';
import { checkBalances } from '../utils/api.js';
import { recordEliminated, incrementRandomClicks } from '../utils/supabase.js';

const truncate = (s: string, len: number) =>
    s.length > len ? s.slice(0, len / 2) + '…' + s.slice(-len / 2) : s;

export const handleRandom = async (bot: TelegramBot, chatId: number) => {
    const page = generateRandomPage();
    await incrementRandomClicks();

    const msg = await bot.sendMessage(chatId,
        `🔍 *Сканирование страницы...*\n\`#${truncate(page, 20)}\`\n\n⏳ Генерация 128 ключей...`,
        { parse_mode: 'Markdown' }
    );

    // Generate all addresses
    const ethAddresses: string[] = [];
    const wallets: Array<{ privateKey: string; ethAddress: string; btcAddress: string }> = [];

    for (let i = 0; i < Number(ROWS_PER_PAGE); i++) {
        try {
            const w = generateWallet(i, page);
            ethAddresses.push(w.ethAddress);
            wallets.push(w);
        } catch { /* skip */ }
    }

    await bot.editMessageText(
        `🔍 *Страница* \`#${truncate(page, 20)}\`\n\n⏳ Проверка балансов... (${ethAddresses.length} адресов)`,
        { chat_id: chatId, message_id: msg.message_id, parse_mode: 'Markdown' }
    );

    const result = await checkBalances(ethAddresses);

    let text: string;

    if (result.balances.length > 0) {
        // Found something!
        const lines = result.balances.map(b => {
            const w = wallets.find(w => w.ethAddress === b.address);
            return `💰 *${b.balance.toFixed(6)} ${b.symbol}*\n   🔑 \`${truncate(b.address, 16)}\``;
        });

        text = `🚨 *ОБНАРУЖЕНЫ СРЕДСТВА!*\n\n` +
            `📄 Страница: \`#${truncate(page, 20)}\`\n\n` +
            lines.join('\n\n') +
            `\n\n⚠️ Внимание: возможны honeypot-ловушки!`;
    } else if (result.allVerified) {
        await recordEliminated(page, result.networksVerified);

        text = `✅ *Сектор утилизирован!*\n\n` +
            `📄 Страница: \`#${truncate(page, 20)}\`\n` +
            `🔑 Проверено ключей: ${wallets.length}\n` +
            `🌐 Сети: ${result.networksVerified.join(', ')}\n` +
            `💰 Найдено: $0.00\n\n` +
            `♻️ Сектор навсегда удалён из реестра`;
    } else {
        text = `⚠️ *Частичная проверка*\n\n` +
            `📄 Страница: \`#${truncate(page, 20)}\`\n` +
            `🌐 Проверено сетей: ${result.networksVerified.join(', ') || 'нет'}\n` +
            `❌ Ошибки: ${result.errors.length}\n\n` +
            `Попробуйте ещё раз: /random`;
    }

    await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
    });
};
