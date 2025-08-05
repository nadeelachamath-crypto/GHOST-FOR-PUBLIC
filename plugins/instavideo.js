const { cmd } = require("../command");
const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const cookiesPath = path.join(__dirname, "../instacookies.txt");

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

      const info = await ytdlp(q, {
        dumpSingleJson: true,
        cookies: cookiesPath,
        noCheckCertificate: true,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
      });

      const format =
        info.formats.find(
          (f) => f.ext === "mp4" && f.vcodec !== "none" && f.acodec !== "none"
        ) ||
        info.formats.find((f) => f.ext === "mp4" && f.vcodec !== "none");

      if (!format || !format.url) return reply("❌ No video URL found.");

      const title = info.title || "Instagram Video";
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 50);
      const tempPath = path.join(tmpdir(), `${uuidv4()}.mp4`);

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

      await robin.sendMessage(
        from,
        {
          document: fs.createReadStream(tempPath),
          fileName: `${cleanTitle}.mp4`,
          mimetype: "video/mp4",
          caption: `🎥 *Instagram Video*\n🔗 ${q}`,
        },
        { quoted: mek }
      );

      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error("❌ IG Downloader Error:", err);
      reply(`❌ Error: ${err.message || err.stderr || "Unknown error"}`);
    }
  }
);
