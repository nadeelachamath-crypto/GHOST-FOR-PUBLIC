const { cmd } = require("../command");
const { readEnv } = require('../lib/database');
const axios = require("axios");



cmd({
  pattern: "alive",
  alias: ["bot", "ghost"],
  react: "👻",
  desc: "Check if the bot is online (image + voice message + audio from URL)",
  category: "main",
  filename: __filename
}, 
async (robin, mek, m, { from, quoted, reply }) => {
  try {
    const config = await readEnv();
    if (!config.ALIVE_IMG || !config.ALIVE_MSG) {
      throw new Error("Missing ALIVE_IMG or ALIVE_MSG in configuration.");
    }

    // Send image + caption
    await robin.sendMessage(from, {
      image: { url: config.ALIVE_IMG },
      caption: `${config.ALIVE_MSG}\n\nBot Name: 👻 Ghost MD 👻`
    }, { quoted: mek });

    // -- Your existing TTS voice note code (optional) --

    // Send song from URL
    const songUrl = "https://cdn.pixabay.com/download/audio/2021/08/09/audio_0b8c6f0c5b.mp3?filename=boo-and-laugh-7060.mp3"; // Set your song URL here
    const response = await axios.get(songUrl, { responseType: "arraybuffer" });
    const audioBuffer = Buffer.from(response.data, "utf-8");

    await robin.sendMessage(from, {
      audio: audioBuffer,
      mimetype: "audio/mpeg",
      fileName: "song.mp3",
      // ptt: false // normal audio
    }, { quoted: mek });

  } catch (e) {
    console.error("Alive command error:", e);
    reply(`❌ Error: ${e.message || "Something went wrong."}`);
  }
});
