import TelegramBot from 'node-telegram-bot-api';
import { getGlobalStats } from '../utils/supabase.js';

export const handleStats = async (bot: TelegramBot, chatId: number) => {
    const stats = await getGlobalStats();

    const percentage = stats.eliminatedCount > 0
        ? (stats.eliminatedCount / 9e74 * 100).toExponential(2)
        : '0';

    const text =
        `📊 *ГЛОБАЛЬНАЯ СТАТИСТИКА*\n\n` +
        `🎲 Нажатий «Рандом»: *${stats.totalClicks.toLocaleString()}*\n` +
        `♻️ Утилизировано секторов: *${stats.eliminatedCount.toLocaleString()}*\n` +
        `💰 Найдено средств: *$${stats.totalFoundUsd.toFixed(2)}*\n` +
        `📈 Очистка: *${percentage}%*\n\n` +
        `🌐 [Открыть в браузере](https://ju1icyju.github.io/kripto-key-library/#stats)`;

    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
    });
};
