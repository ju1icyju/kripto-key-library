import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { handleRandom } from './commands/random.js';
import { handleCheck } from './commands/check.js';
import { handleStats } from './commands/stats.js';
import { handleTurbo } from './commands/turbo.js';

const bot = new TelegramBot(config.botToken, { polling: true });

console.log('🤖 Universal Key Library Bot started!');
console.log('   Commands: /start, /random, /check <page>, /stats, /turbo <count>');

// /start
bot.onText(/\/start/, async (msg) => {
    const text =
        `🔑 *Universal Key Library Bot*\n\n` +
        `Сканируй случайные страницы из 2²⁵⁶ приватных ключей и проверяй балансы Bitcoin/Ethereum в реальном времени.\n\n` +
        `*Команды:*\n` +
        `🎲 /random — случайная страница\n` +
        `🔍 /check \`<номер>\` — проверить конкретную\n` +
        `📊 /stats — глобальная статистика\n` +
        `⚡ /turbo \`<кол-во>\` — турбо-скан (1-20)\n\n` +
        `🌐 [Открыть в браузере](https://ju1icyju.github.io/kripto-key-library/)`;

    await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
    });
});

// /random
bot.onText(/\/random/, async (msg) => {
    try {
        await handleRandom(bot, msg.chat.id);
    } catch (e: any) {
        await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${e.message}`);
    }
});

// /check <page>
bot.onText(/\/check\s+(.+)/, async (msg, match) => {
    if (!match?.[1]) {
        await bot.sendMessage(msg.chat.id, '❌ Используйте: /check 12345');
        return;
    }
    try {
        await handleCheck(bot, msg.chat.id, match[1].trim());
    } catch (e: any) {
        await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${e.message}`);
    }
});

// /stats
bot.onText(/\/stats/, async (msg) => {
    try {
        await handleStats(bot, msg.chat.id);
    } catch (e: any) {
        await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${e.message}`);
    }
});

// /turbo <count>
bot.onText(/\/turbo(?:\s+(\d+))?/, async (msg, match) => {
    const count = match?.[1] || '3';
    try {
        await handleTurbo(bot, msg.chat.id, count);
    } catch (e: any) {
        await bot.sendMessage(msg.chat.id, `❌ Ошибка: ${e.message}`);
    }
});

// Handle unknown commands
bot.on('message', (msg) => {
    if (msg.text?.startsWith('/') && !msg.text.match(/^\/(start|random|check|stats|turbo)/)) {
        bot.sendMessage(msg.chat.id, '❓ Неизвестная команда. Попробуйте /start');
    }
});
