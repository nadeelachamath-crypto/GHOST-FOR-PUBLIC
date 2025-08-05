const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "nsfwimg",
    react: "🍑",
    desc: "Get 3 NSFW images by keyword or random (Rule34.xxx)",
    category: "nsfw",
    filename: __filename,
  },
  async (robin, mek, m, { q, from, reply }) => {
    try {
      const tag = q?.trim().replace(/\s+/g, "_") || "";
      const limit = 100;

      // Rule34 API
      const url = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&limit=${limit}&json=1${tag ? `&tags=${encodeURIComponent(tag)}` : ""}`;

      const res = await axios.get(url, {
        headers: {
          "User-Agent": "GHOST-BOT",
        },
      });

      const results = res.data;
      if (!results || results.length === 0) {
        return reply(`❌ No images found for: *${q || "random"}*`);
      }

      // Pick 3 random images (or less if not enough)
      const selectedImages = [];
      const usedIndexes = new Set();

      while (selectedImages.length < 3 && selectedImages.length < results.length) {
        const randomIndex = Math.floor(Math.random() * results.length);
        if (!usedIndexes.has(randomIndex)) {
          usedIndexes.add(randomIndex);
          selectedImages.push(results[randomIndex]);
        }
      }

      // Send each image with caption
      for (const selected of selectedImages) {
        const imageUrl = selected.file_url;
        const rating = selected.rating || "u";

        const caption = `🍑 *NSFW Image*\n🔍 *Tags:* ${tag || "Random"}\n🔞 *Rating:* ${rating.toUpperCase()}`;
        await robin.sendMessage(from, {
          image: { url: imageUrl },
          caption,
        }, { quoted: mek });
      }

    } catch (err) {
      console.error("pornimage error:", err.message);
      reply("❌ Failed to fetch images. Try another keyword.");
    }
  }
);
