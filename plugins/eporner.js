const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { cmd } = require('../command');
const axios = require('axios');

// Helper to sanitize file names
function safeFileName(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').slice(0, 100);
}

cmd({
    pattern: "eporner",
    alias: ["epdl"],
    react: "🫦",
    filename: __filename
}, async (conn, mek, m, { from, q, args, reply }) => {
    try {
        if (!q || !q.includes('eporner.com'))
            return reply('❌ Please provide a valid Eporner link.');

        const quality = args.find(a => a.endsWith('p')) || '720p';

        // Create /temp folder if not exists
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const timestamp = Date.now();
        const outputPath = path.join(tempDir, `ep_${timestamp}.mp4`);

        // Step 1: Fetch metadata using yt-dlp
        const meta = spawn('yt-dlp', [
            '--dump-json',
            '-f', `best[height<=${parseInt(quality)}]`,
            q
        ]);

        let jsonData = '';
        meta.stdout.on('data', (data) => jsonData += data);
        meta.stderr.on('data', (err) => console.error('[yt-dlp stderr]', err.toString()));

        meta.on('close', async () => {
            let info;
            try {
                info = JSON.parse(jsonData);
            } catch (e) {
                return reply('❌ Failed to parse video metadata.');
            }

            const title = info.title || 'Eporner Video';
            const cleanTitle = safeFileName(title);
            const metaText = `🎬 *${title}*\n👁 Views: ${info.view_count?.toLocaleString() || 'N/A'}\n⏱ Duration: ${info.duration || '?'}s\n📥 Quality: ${quality}\n🔗 ${q}`;

            // Step 2: Show thumbnail with metadata
            if (info.thumbnail) {
                try {
                    const thumbRes = await axios.get(info.thumbnail, { responseType: 'arraybuffer' });
                    await conn.sendMessage(from, {
                        image: Buffer.from(thumbRes.data),
                        caption: metaText
                    }, { quoted: mek });
                } catch (err) {
                    console.warn('❌ Thumbnail failed:', err.message);
                    await reply(metaText);
                }
            } else {
                await reply(metaText);
            }

            // Step 3: Download video
            const download = spawn('yt-dlp', [
                '-f', `best[height<=${parseInt(quality)}]`,
                '-o', outputPath,
                q
            ]);

            download.stderr.on('data', err => console.error('[yt-dlp download stderr]', err.toString()));

            download.on('close', async () => {
                if (!fs.existsSync(outputPath))
                    return reply('❌ Failed to download the video.');

                await conn.sendMessage(from, {
                    document: fs.readFileSync(outputPath),
                    fileName: `${cleanTitle}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🎬 *${title}*\n🔗 ${q}`
                }, { quoted: mek });

                fs.unlinkSync(outputPath); // clean up
            });
        });

    } catch (e) {
        console.error('❌ Handler Error:', e);
        reply(`❌ Error: ${e.message}`);
    }
});
