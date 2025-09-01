const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "hentai",
    react: '💓',
    category: "nsfw",
    desc: "Send a 3D hentai video from PixelDrain",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        reply('🔍 Searching for hentai video...');

        // Fetch from API using axios
        const searchVid = `https://apis-keith.vercel.app/dl/hentaivid`;
        const { data: response } = await axios.get(searchVid, {
            headers: { 'User-Agent': 'GHOST-BOT' }
        });

        if (!response || !response.result || response.result.length === 0) {
            return reply('❌ No videos found.');
        }

        // Select the first video
        const selectVid = response.result[0];

        // Video caption
        const cap = `
🎥 *Title:* ${selectVid.title}
📂 *Category:* ${selectVid.category}
👀 *Views:* ${selectVid.views_count}
🔗 *Link:* ${selectVid.link}
`;

        // Send video
        await conn.sendMessage(
            from,
            {
                video: { url: selectVid.media.video_url },
                caption: cap,
            },
            { quoted: mek }
        );

        reply('✅ Video sent!');
    } catch (e) {
        console.error('Hentai plugin error:', e);
        reply(`❌ Failed to fetch video. Error: ${e.message || e}`);
    }
});
