const axios = require('axios');
const cheerio = require('cheerio');
const { cmd } = require('../command');

const SCRAPERAPI_KEY = 'YOUR_SCRAPERAPI_KEY'; // <-- Replace with your key

async function getXHamsterLinks(query) {
    const searchUrl = `https://xhamster.com/search/${encodeURIComponent(query)}`;
    const apiUrl = `http://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(searchUrl)}`;

    const res = await axios.get(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: 15000,
    });

    const $ = cheerio.load(res.data);
    const links = [];

    $('div.video-thumb a.video-thumb__image-container').slice(0, 5).each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/videos/')) {
            links.push('https://xhamster.com' + href);
        }
    });

    return links;
}

cmd({
    pattern: "xhs",
    alias: ["xhamsearch"],
    react: "🔎",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply('*Enter a search query*');

        const links = await getXHamsterLinks(q);
        if (!links.length) return reply('❌ No links found.');

        const caption = links.map((link, i) => `*${i + 1}*. ${link}`).join('\n\n');
        await conn.sendMessage(from, {
            text: `🔞 *Top XHamster Results:*\n\n${caption}`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply(`❌ Error: ${err.message}`);
    }
});
