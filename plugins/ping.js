const { cmd } = require("../command");

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

cmd(
  {
    pattern: "ping",
    desc: "Ping, uptime and RAM usage",
    react: "🏓",
    category: "test",
  },
  async (robin, mek, m, { reply }) => {
    try {
      const chatId = m?.from || m?.key?.remoteJid;
      if (!chatId) return reply("❌ Invalid chat ID.");

      const start = Date.now();

      await robin.sendMessage(chatId, { text: "🏓 Pinging..." }, mek ? { quoted: mek } : {});

      const latency = Date.now() - start;
      const uptime = formatUptime(process.uptime());

      const ramBytes = process.memoryUsage().rss;
      const ramMB = (ramBytes / 1024 / 1024).toFixed(2);

      const message = `🏓 *PONG!*

📶 *Latency:* ${latency}ms
⏱ *Uptime:* ${uptime}
🧠 *RAM:* ${ramMB} MB`;

      reply(message);
    } catch (err) {
      console.error("Ping error:", err);
      reply(`❌ Error during ping.\n\`\`\`\n${err.message}\n\`\`\``);
    }
  }
);
