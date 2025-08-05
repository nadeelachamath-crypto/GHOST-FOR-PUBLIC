const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
}

cmd(
  {
    pattern: "xhamster",
    react: "🎥",
    desc: "Download best quality (max 720p) or specific resolution from XHamster",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, reply, from }) => {
    try {
      if (!q) return reply("❗ Provide a link (optionally with resolution like `360p`)");

      const args = q.trim().split(" ");
      let userQuality = null;
      let url = null;

      if (/^\d{3,4}p$/.test(args[0])) {
        userQuality = parseInt(args[0]);
        url = args[1];
      } else {
        url = args[0];
      }

      if (!url || !url.includes("xhamster.com")) {
        return reply("❗ Provide a valid XHamster video link.");
      }

      const cleanUrl = url.trim().split("?")[0];
      reply("🔍 Scraping metadata...");

      const res = await axios.get(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.google.com/",
        },
      });

      const $ = cheerio.load(res.data);
      const scripts = $("script").map((_, el) => $(el).html()).get();

      let videoUrl = null;
      let videoOptions = [];

      // ✅ Safe regex for all .mp4 links
      const videoRegex = new RegExp('"url":"(https:\\\\\/\\\\\/[^"]+?\\.mp4)"', "g");

      for (const script of scripts) {
        if (typeof script === "string" && script.includes(".mp4")) {
          const matches = [...script.matchAll(videoRegex)];
          for (const match of matches) {
            const rawUrl = match[1].replace(/\\\//g, "/");
            const qualityMatch = rawUrl.match(/(\d{3,4})p/);
            const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
            videoOptions.push({ url: rawUrl, quality });
          }
        }
      }

      if (videoOptions.length === 0) {
        return reply("❌ No video links found.");
      }

      // 📊 Sort from best → worst
      videoOptions.sort((a, b) => b.quality - a.quality);

      // 🎯 Max 720p logic
      if (userQuality) {
        videoUrl = videoOptions.find((v) => v.quality === userQuality)?.url;
        if (!videoUrl) return reply(`❌ ${userQuality}p not available.`);
      } else {
        const below720p = videoOptions.filter((v) => v.quality <= 720);
        if (below720p.length === 0) {
          return reply("❌ No versions available below or equal to 720p.");
        }
        videoUrl = below720p[0].url;
      }

      if (!videoUrl) return reply("❌ No suitable video found.");

      const title = $("title").text().trim().slice(0, 100);
      const thumb = $('meta[property="og:image"]').attr("content");
      const rawDuration = $('meta[property="video:duration"]').attr("content");
      const duration = rawDuration ? formatDuration(parseInt(rawDuration)) : "Unknown";
      const actualQuality = videoOptions.find((v) => v.url === videoUrl)?.quality || "Unknown";

      let caption = `👻 *GHOST xHamster PREVIEW*\n\n`;
      caption += `📝 *Title:* ${title}\n`;
      caption += `⏱ *Duration:* ${duration}\n`;
      caption += `🎞 *Quality:* ${actualQuality}p\n`;
      caption += `🔗 ${cleanUrl}\n\n`;
      caption += `📥 Downloading video...`;

      await robin.sendMessage(
        from,
        {
          image: { url: thumb },
          caption,
        },
        { quoted: mek }
      );

      const video = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: cleanUrl,
        },
      });

      if (video.data.byteLength < 50000) {
        return reply("❌ Video file too small or broken.");
      }

      const safeFileName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 64)}.mp4`;

      await robin.sendMessage(
        from,
        {
          document: video.data,
          mimetype: "video/mp4",
          fileName: safeFileName,
          caption: `🎥 *XHamster ${actualQuality}p Video*\n📝 ${title}\n🔗 ${cleanUrl}`,
        },
        { quoted: mek }
      );

      reply("✅ Video sent as document!");
    } catch (e) {
      console.error("xhamster error:", e.message);
      reply(`❌ Error: ${e.message}`);
    }
  }
);
