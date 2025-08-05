const { cmd } = require("../command");
const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const tempDir = path.resolve(__dirname, "../temp");
const cookiesPath = path.resolve(__dirname, "../cookies/instacookies.txt");

cmd(
  {
    pattern: "ig",
    alias: ["instagram", "igdl"],
    desc: "Download Instagram videos using yt-dlp and cookies",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q || !q.includes("instagram.com"))
        return reply("❌ Send a valid Instagram post/video/reel URL.");

      await reply("📥 Getting Instagram video info...");

      // Fetch video info metadata from yt-dlp
      const info = await ytdlp(q, {
        dumpSingleJson: true,
        cookies: cookiesPath,
        noCheckCertificate: true,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
      });

      // Find best video format with both audio and video
      const format =
        info.formats.find(
          (f) => f.ext === "mp4" && f.vcodec !== "none" && f.acodec !== "none"
        ) ||
        info.formats.find((f) => f.ext === "mp4" && f.vcodec !== "none");

      if (!format || !format.url) return reply("❌ No video URL found.");

      // Prepare safe filename & temp path
      const title = info.title || "Instagram Video";
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 50);
      const tempPath = path.join(tempDir, `${uuidv4()}.mp4`);

      // Download the video stream
      const writer = fs.createWriteStream(tempPath);
      const res = await axios.get(format.url, {
        responseType: "stream",
        headers: {
          Referer: "https://www.instagram.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
        },
        timeout: 60000,
      });

      res.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Send video as video message (not document)
      await robin.sendMessage(
        from,
        {
          video: fs.createReadStream(tempPath),
          mimetype: "video/mp4",
          fileName: `${cleanTitle}.mp4`,
          caption: `🎥 *Instagram Video*\n🔗 ${q}`,
          gifPlayback: false,
        },
        { quoted: mek }
      );

      // Delete temp file after sending
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error("❌ IG Downloader Error:", err);
      reply(`❌ Error: ${err.message || err.stderr || "Unknown error"}`);
    }
  }
);
