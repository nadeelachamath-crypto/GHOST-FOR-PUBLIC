const { cmd } = require("../command");
const ytsr = require("yt-search");
const ytdlp = require("yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");

// Optional: Set custom ffmpeg path if needed
// ffmpeg.setFfmpegPath("./bin/ffmpeg");

const COOKIES_PATH = "cookies/yt.txt";

cmd(
  {
    pattern: "song",
    react: "🎵",
    desc: "Download Song (yt-dlp)",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("*Please provide a song name or YouTube URL.*");

      const search = await ytsr(q);
      const data = search.videos[0];
      if (!data) return reply("❌ Song not found.");

      const videoUrl = data.url;
      const id = Date.now();
      const tempDir = `./temp/${id}`;
      await fs.ensureDir(tempDir);

      const webmPath = path.join(tempDir, "audio.webm");
      const mp3Path = path.join(tempDir, "audio.mp3");
      const oggPath = path.join(tempDir, "audio.ogg");

      const desc = `
*GHOST SONG DOWNLOADER 👻*

👻 *title* : ${data.title}
👻 *description* : ${data.description}
👻 *time* : ${data.timestamp}
👻 *ago* : ${data.ago}
👻 *views* : ${data.views}
👻 *url* : ${data.url}

𝐌𝐚𝐝𝐞 𝐛𝐲 Nadeela chamath 🗿
`;

      await robin.sendMessage(
        from,
        { image: { url: data.thumbnail }, caption: desc },
        { quoted: mek }
      );

      // Download audio as .webm
      await ytdlp(videoUrl, {
        output: webmPath,
        format: "bestaudio[ext=webm]",
        cookies: COOKIES_PATH,
        quiet: true,
      });

      // Convert to .mp3
      await new Promise((resolve, reject) => {
        ffmpeg(webmPath)
          .audioCodec("libmp3lame")
          .audioBitrate(128)
          .on("end", resolve)
          .on("error", reject)
          .save(mp3Path);
      });

      // Convert to .ogg (Opus encoded)
      
      // Duration check
      let durationParts = data.timestamp.split(":").map(Number);
      let totalSeconds =
        durationParts.length === 3
          ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
          : durationParts[0] * 60 + durationParts[1];

      if (totalSeconds > 1800) {
        await fs.remove(tempDir);
        return reply("⏱️ Audio limit is 30 minutes.");
      }

      // Send .ogg as voice note
      await robin.sendMessage(
        from,
        {
          audio: { url: mp3Path },
          mimetype: "audio/mpeg",
          ptt: false, // set true if you want it as voice
        },
        { quoted: mek }
      );
      // Send .mp3 as document
      await robin.sendMessage(
        from,
        {
          document: { url: mp3Path },
          mimetype: "audio/mpeg",
          fileName: `${data.title}.mp3`,
          caption: "𝐌𝐚𝐝𝐞 𝐛𝐲 Nadeela chamath 🗿",
        },
        { quoted: mek }
      );

      await fs.remove(tempDir);
      reply("*Thanks for using my bot!* 👻");
    } catch (e) {
      console.log(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);
