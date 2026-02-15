import TelegramBot from 'node-telegram-bot-api';
import { generateRandomPage, ROWS_PER_PAGE } from '../utils/crypto.js';
import { generateWallet } from '../utils/crypto.js';
import { checkBalances } from '../utils/api.js';
import { recordEliminated, incrementRandomClicks } from '../utils/supabase.js';

const truncate = (s: string, len: number) =>
    s.length > len ? s.slice(0, len / 2) + '…' + s.slice(-len / 2) : s;

export const handleTurbo = async (bot: TelegramBot, chatId: number, countStr: string) => {
    let count = parseInt(countStr) || 3;
    if (count < 1) count = 1;
    if (count > 20) count = 20;

    const msg = await bot.sendMessage(chatId,
        `⚡ *ТУРБО-СКАНИРОВАНИЕ*\n\nСтраниц: *${count}*\n⏳ Запуск...`,
        { parse_mode: 'Markdown' }
    );

    let scanned = 0;
    let eliminated = 0;
    let totalFound = 0;
    const foundDetails: string[] = [];

    for (let p = 0; p < count; p++) {
        const page = generateRandomPage();
        await incrementRandomClicks();

        // Generate addresses
        const ethAddresses: string[] = [];
        for (let i = 0; i < Number(ROWS_PER_PAGE); i++) {
            try {
                const w = generateWallet(i, page);
                ethAddresses.push(w.ethAddress);
            } catch { /* skip */ }
        }

        const result = await checkBalances(ethAddresses);
        scanned++;

        if (result.balances.length > 0) {
            const total = result.balances.reduce((s, b) => s + b.balance, 0);
            totalFound += total;
            foundDetails.push(`💰 #${truncate(page, 12)}: $${total.toFixed(4)}`);
        } else if (result.allVerified) {
            await recordEliminated(page, result.networksVerified);
            eliminated++;
        }

        // Update progress every 2 pages
        if (scanned % 2 === 0 || scanned === count) {
            const progress = Math.round((scanned / count) * 100);
            const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

            let text = `⚡ *ТУРБО-СКАНИРОВАНИЕ*\n\n` +
                `[${bar}] ${progress}%\n\n` +
                `📄 Просканировано: *${scanned}/${count}*\n` +
                `♻️ Утилизировано: *${eliminated}*\n` +
                `💰 Найдено: *$${totalFound.toFixed(2)}*`;

            if (foundDetails.length > 0) {
                text += '\n\n' + foundDetails.join('\n');
            }

            try {
                await bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'Markdown',
                });
            } catch { /* ignore rate limits */ }
        }
    }

    // Final message
    let finalText = `✅ *ТУРБО ЗАВЕРШЕНО!*\n\n` +
        `📄 Просканировано: *${scanned}*\n` +
        `♻️ Утилизировано: *${eliminated}*\n` +
        `💰 Найдено: *$${totalFound.toFixed(2)}*`;

    if (foundDetails.length > 0) {
        finalText += '\n\n🚨 *Находки:*\n' + foundDetails.join('\n');
    }

    finalText += '\n\n🔄 Ещё раз: /turbo ' + count;

    try {
        await bot.editMessageText(finalText, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
        });
    } catch { /* ignore */ }
};
