import dotenv from 'dotenv';
dotenv.config();

export const config = {
    botToken: process.env.BOT_TOKEN || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
};

if (!config.botToken) {
    console.error('❌ BOT_TOKEN is required. Set it in .env file.');
    process.exit(1);
}
