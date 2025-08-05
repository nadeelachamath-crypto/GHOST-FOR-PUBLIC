const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "hentai",
    react: "💓",
    desc: "Send a random 3D hentai video from Rule34.xxx by tag",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, reply, from }) => {
    try {
      const tag = q?.trim().replace(/\s+/g, "_") || "3d";

      reply(`🔍 Searching Rule34.xxx for videos tagged: *${tag}*...`);

      const apiUrl = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&limit=100&json=1&tags=${encodeURIComponent(tag)}`;
      const res = await axios.get(apiUrl, { headers: { "User-Agent": "GHOST-BOT" } });

      const posts = res.data;
      if (!posts || posts.length === 0) {
        return reply(`❌ No results found for tag: *${tag}*`);
      }

      const videos = posts.filter(post => post.file_url.endsWith(".mp4") || post.file_url.endsWith(".webm"));

      if (videos.length === 0) {
        return reply(`❌ No videos found for tag: *${tag}*`);
      }

      const selected = videos[Math.floor(Math.random() * videos.length)];
      const videoUrl = selected.file_url;

      if (!videoUrl.startsWith("http")) {
        return reply("❌ Invalid video URL.");
      }

      const videoResp = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "GHOST-BOT" },
      });

      if (videoResp.data.byteLength < 100000) {
        return reply("❌ Video file too small or corrupted.");
      }

      const caption = `🎥 *Rule34.xxx Video*\n🔍 *Tag:* ${tag}\n🔗 https://rule34.xxx/index.php?page=post&s=view&id=${selected.id}`;

      await robin.sendMessage(
        from,
        {
          video: videoResp.data,
          mimetype: videoUrl.endsWith(".mp4") ? "video/mp4" : "video/webm",
          caption,
        },
        { quoted: mek }
      );

      reply("✅ Video sent!");
    } catch (e) {
      console.error("Rule34 video error:", e.message);
      reply(`❌ Error: ${e.message || "Failed to fetch video."}`);
    }
  }
);
