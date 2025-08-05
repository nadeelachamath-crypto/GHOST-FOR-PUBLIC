const { cmd } = require("../command");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const ytdlp = require("yt-dlp-exec");

const cookiesPath = path.resolve(__dirname, "/workspaces/GHOST-FOR-PUBLIC/cookies/pornhubcookies.txt");
const tempFolder = path.resolve(__dirname, "../temp");

if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);

function parseNetscapeCookies(filePath, domain = "pornhub.com") {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const cookies = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length >= 7 && parts[0].includes(domain)) {
      cookies.push(`${parts[5]}=${parts[6]}`);
    }
  }

  return cookies.join("; ");
}

cmd(
  {
    pattern: "pornhub",
    alias: ["ph", "pornhubdl"],
    react: "💦",
    desc: "Download Pornhub video as document (max 720p)",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply }) => {
    try {
      if (!q || !q.includes("pornhub.com"))
        return reply("❌ Please provide a valid Pornhub video URL.");

      console.log("📥 Getting video info from yt-dlp...");
      const info = await ytdlp(q, {
        dumpSingleJson: true,
        cookies: cookiesPath,
        noCheckCertificate: true,
      });
      console.log("✅ yt-dlp metadata fetched.");

      let format =
        info.formats.find(
          (f) =>
            f.ext === "mp4" &&
            f.acodec !== "none" &&
            f.vcodec !== "none" &&
            f.height === 720 &&
            f.url
        ) ||
        info.formats
          .filter(
            (f) =>
              f.ext === "mp4" &&
              f.acodec !== "none" &&
              f.vcodec !== "none" &&
              f.height &&
              f.height <= 720 &&
              f.url
          )
          .sort((a, b) => b.height - a.height)[0] ||
        info.formats.find(
          (f) =>
            f.ext === "mp4" &&
            f.acodec !== "none" &&
            f.vcodec !== "none" &&
            f.url
        );

      if (!format || !format.url)
        return reply("❌ No suitable video format found.");

      const sizeMB = format.filesize
        ? (format.filesize / 1048576).toFixed(2) + " MB"
        : "Unknown";
      const views = info.view_count
        ? info.view_count.toLocaleString()
        : "Unknown";
      const duration = info.duration
        ? new Date(info.duration * 1000).toISOString().substr(11, 8)
        : "Unknown";

      const metadata = `👻 *GHOST PORNHUB DOWNLOADER*

🎥 *Title:* ${info.title}
🕒 *Duration:* ${duration}
👁 *Views:* ${views}
📦 *Quality:* ${format.height || "?"}p
📁 *Size:* ${sizeMB}
🔗 *URL:* ${q}`;

      if (info.thumbnail) {
        await robin.sendMessage(
          from,
          { image: { url: info.thumbnail }, caption: metadata },
          { quoted: mek }
        );
      } else {
        await reply(metadata);
      }

      const safeTitle = info.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
      const tempPath = path.join(tempFolder, `${uuidv4()}.mp4`);

      console.log("⬇️ Downloading video...");

      const videoStream = await axios.get(format.url, {
        responseType: "stream",
        headers: {
          Referer: "https://www.pornhub.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
          Cookie: parseNetscapeCookies(cookiesPath),
        },
        timeout: 60000,
      });

      const writer = fs.createWriteStream(tempPath);
      videoStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      if (!fs.existsSync(tempPath))
        return reply("❌ Video file was not found.");

      const stats = fs.statSync(tempPath);
      console.log(`✅ Download complete: ${(stats.size / 1048576).toFixed(2)} MB`);

      console.log("📤 Sending video as document...");
      const readStream = fs.createReadStream(tempPath);

      await robin.sendMessage(
        from,
        {
          document: { stream: readStream },
          mimetype: "video/mp4",
          fileName: `${safeTitle}.mp4`,
          caption: `🎬 *${info.title}*\n📦 ${format.height || "?"}p • ${sizeMB}`,
        },
        { quoted: mek }
      );

      readStream.on("close", () => {
        fs.unlink(tempPath, (err) => {
          if (err) console.warn("🧹 Failed to delete temp file:", err);
          else console.log("🧹 Temp file deleted.");
        });
      });
    } catch (err) {
      console.error("❌ Pornhub downloader error:", err);
      reply(`❌ Error: ${err.message || "Unknown error"}`);
    }
  }
);


