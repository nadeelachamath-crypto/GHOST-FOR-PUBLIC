const { cmd } = require('../command');
const Pornsearch = require('pornsearch');

cmd({
    pattern: "xvdl",
    alias: ["xdl"],
    react: "🔞",
    filename: __filename
}, async (conn, mek, m, {
    from, args, q, reply
}) => {
    try {
        if (!q) return reply('*Please provide a search keyword*');

        const search = new Pornsearch(q, 'xvideos');
        const results = await search.videos();

        if (!results || results.length === 0) return reply('❌ No results found.');

        // Display top 5 results
        let caption = `🔞 *Top Results for:* ${q}\n\n`;
        results.slice(0, 5).forEach((video, index) => {
            caption += `*${index + 1}*. ${video.title}\nDuration: ${video.duration}\nURL: ${video.url}\n\n`;
        });
        caption += `\n🔁 *Reply with a number (1-5) to download a video.*`;

        const sentMsg = await conn.sendMessage(from, {
            text: caption
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        // Listener for the user's reply
        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages[0];
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const isReply = msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo?.stanzaId === messageID;

            if (isReply && /^[1-5]$/.test(text.trim())) {
                const choice = parseInt(text.trim()) - 1;
                const selected = results[choice];

                if (!selected || !selected.url) return reply('Invalid selection.');

                await conn.sendMessage(from, { react: { text: '⬇️', key: msg.key } });

                await conn.sendMessage(from, {
                    image: { url: selected.thumb },
                    caption: `🎬 *Title:* ${selected.title}\n⏱ Duration: ${selected.duration}\n🔗 ${selected.url}`
                }, { quoted: msg });

                // Optionally download and send video file from selected.url here
                // This requires additional logic (scraping actual video file link or using 3rd party tool)
            }
        });

    } catch (err) {
        console.error(err);
        reply(`❌ Error: ${err.message}`);
    }
});
