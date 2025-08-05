const { cmd } = require("../command");
const yts = require("yt-search");
const path = require("path");
const ytdlp = require("yt-dlp-exec");

const cookiesPath = path.resolve(__dirname, "../cookies/youtube_cookies.txt");

cmd(
  {
    pattern: "video",
    react: "🎥",
    desc: "Download YouTube video (max 720p MP4 with metadata)",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("❌ Provide a YouTube name or URL.");

      let url = q;
      if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
        const search = await yts(q);
        if (!search.videos.length) return reply("❌ No results found.");
        url = search.videos[0].url;
      }

      const info = await ytdlp(url, {
        dumpSingleJson: true,
        cookies: cookiesPath,
      });

      // Prefer <=720p MP4 with both audio & video
      let format = info.formats.find(
        (f) =>
          f.ext === "mp4" &&
          f.acodec !== "none" &&
          f.vcodec !== "none" &&
          f.height === 720 &&
          f.url
      );

      if (!format) {
        format = info.formats
          .filter(
            (f) =>
              f.ext === "mp4" &&
              f.acodec !== "none" &&
              f.vcodec !== "none" &&
              f.height &&
              f.height <= 720 &&
              f.url
          )
          .sort((a, b) => b.height - a.height)[0];
      }

      if (!format) {
        format = info.formats.find(
          (f) =>
            f.ext === "mp4" &&
            f.acodec !== "none" &&
            f.vcodec !== "none" &&
            f.url
        );
      }

      if (!format || !format.url) {
        return reply("❌ No valid MP4 format found.");
      }

      const sizeMB = format.filesize ? (format.filesize / 1048576).toFixed(2) + " MB" : "Unknown";
      const views = info.view_count ? info.view_count.toLocaleString() : "Unknown";
      const duration = info.duration ? new Date(info.duration * 1000).toISOString().substr(11, 8) : "Unknown";

      const metadata = `👻 GHOST VIDEO DOWNLOADER

🎥 *${info.title}*
📺 *Channel:* ${info.uploader}
🕒 *Duration:* ${duration}
👁 *Views:* ${views}
📅 *Uploaded:* ${info.upload_date || "Unknown"}
📦 *Quality:* ${format.height}p
📁 *Size:* ${sizeMB}
🔗 ${url}`;

      // Send thumbnail + metadata
      await robin.sendMessage(
        from,
        { image: { url: info.thumbnail }, caption: metadata },
        { quoted: mek }
      );

      // Send video
      await robin.sendMessage(
        from,
        {
          video: { url: format.url },
          mimetype: "video/mp4",
          caption: `🎬 *${info.title}*\n📦 ${format.height}p • ${sizeMB}`,
        },
        { quoted: mek }
      );
    } catch (e) {
      console.error("yt-dlp error:", e);
      reply(`❌ Error: ${e.message || "Failed to fetch video."}`);
    }
  }
);
