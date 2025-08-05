const { cmd } = require('../command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const config = require('../config');

const API_URL = "https://api.skymansion.site/movies-dl/search";
const DOWNLOAD_URL = "https://api.skymansion.site/movies-dl/download";
const API_KEY = config.MOVIE_API_KEY;

cmd({
  pattern: "movie",
  alias: ["moviedl", "films"],
  react: '🎬',
  category: "download",
  desc: "Stream movie (480p) from PixelDrain",
  filename: __filename
}, async (robin, m, mek, { from, q, reply }) => {
  try {
    if (!q || q.trim() === '') return reply('❌ Please provide a movie name!');

    const searchUrl = `${API_URL}?q=${encodeURIComponent(q)}&api_key=${API_KEY}`;
    const searchResponse = await fetchJson(searchUrl);

    if (!searchResponse?.SearchResult?.result?.length)
      return reply(`❌ No results found for: *${q}*`);

    const selectedMovie = searchResponse.SearchResult.result[0];
    const detailsUrl = `${DOWNLOAD_URL}/?id=${selectedMovie.id}&api_key=${API_KEY}`;
    const detailsResponse = await fetchJson(detailsUrl);

    const driveLinks = detailsResponse?.downloadLinks?.result?.links?.driveLinks || [];
    const selected = driveLinks.find(x => x.quality === "SD 480p");

    if (!selected?.link?.startsWith('http')) return reply('❌ 480p PixelDrain link not available.');

    const fileId = selected.link.split('/').pop();
    const directDownloadLink = `https://pixeldrain.com/api/file/${fileId}?download`;

    // Get video stream buffer
    const response = await axios({
      method: 'GET',
      url: directDownloadLink,
      responseType: 'arraybuffer'
    });

    const buffer = response.data;

    await robin.sendMessage(
      from,
      {
        document: buffer,
        mimetype: 'video/mp4',
        fileName: `${selectedMovie.title.replace(/[^\w\s]/gi, '')}-480p.mp4`,
        caption: `🎬 *${selectedMovie.title}*\n📥 480p Streamed from PixelDrain`,
      },
      { quoted: mek }
    );

  } catch (err) {
    console.error('Movie stream error:', err);
    reply("❌ Error streaming movie. Your bot host may not support large buffers.");
  }
});
