// All required imports
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const P = require("pino");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const { File } = require("megajs");
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require("./lib/functions");

const { sms, downloadMediaMessage } = require("./lib/msg");
const connectDB = require("./lib/mongodb");
const { readEnv } = require("./lib/database");

const rawConfig = require("./config");
const ownerNumber = rawConfig.OWNER_NUM;
const sessionFilePath = path.join(__dirname, "auth_info_baileys/creds.json");

// =================== SESSION SETUP ============================
async function ensureSession() {
  if (fs.existsSync(sessionFilePath)) return;

  if (!rawConfig.SESSION_ID) {
    console.error("❌ Please set your SESSION_ID in config.js or environment variables.");
    process.exit(1);
  }

  try {
    const file = File.fromURL(`https://mega.nz/file/${rawConfig.SESSION_ID}`);
    await file.loadAttributes();

    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(sessionFilePath);
      file.download().pipe(writeStream);
      writeStream.on("finish", () => {
        console.log("✅ Session downloaded successfully");
        resolve();
      });
      writeStream.on("error", reject);
    });
  } catch (err) {
    console.error("❌ Failed to download session:", err.message);
    process.exit(1);
  }
}

// =================== PLUGIN LOADER ============================
function loadPlugins() {
  const pluginDir = path.resolve(__dirname, "plugins");
  console.log("📂 Loading plugins from:", pluginDir);

  if (!fs.existsSync(pluginDir)) {
    console.warn("⚠️ Plugins directory does not exist!");
    return;
  }

  const pluginFiles = fs.readdirSync(pluginDir);
  if (pluginFiles.length === 0) {
    console.warn("⚠️ No plugins found in plugins directory.");
  }

  pluginFiles.forEach((file) => {
    if (file.endsWith(".js")) {
      const pluginPath = path.join(pluginDir, file);
      try {
        require(pluginPath);
        console.log(`✅ Loaded plugin: ${file}`);
      } catch (err) {
        console.error(`❌ Failed to load plugin ${file}:`, err.message);
      }
    }
  });
}

// =================== CONNECT FUNCTION ============================
async function connectToWA() {
  await connectDB();
  const envConfig = await readEnv();
  const prefix = envConfig.PREFIX;

  console.log("🔌 Connecting GHOST MD...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys/");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(shouldReconnect ? "🔄 Reconnecting..." : "🔒 Session closed, logged out.");
      if (shouldReconnect) connectToWA();
    } else if (connection === "open") {
      console.log("✅ GHOST MD connected!");
      loadPlugins(); // load plugins after connection
      sock.sendMessage(ownerNumber + "@s.whatsapp.net", {
        image: {
          url: "https://thumbs.dreamstime.com/b/halloween-ghost-clipart-background-ghost-silhouette-halloween-ghost-logo-isolated-white-background-vector-template-halloween-330896848.jpg",
        },
        caption: "👻GHOST MD👻 connected successfully ✅",
      });
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const mek = messages[0];
      if (!mek?.message) return;

      if (rawConfig.AUTO_STATUS_SEEN && mek.key.remoteJid === "status@broadcast") {
        try {
          await sock.readMessages([mek.key]);
          console.log(`✅ Auto-seen status from ${mek.pushName || "unknown"}`);
          return;
        } catch (e) {
          console.error("❌ Auto status seen failed:", e.message);
        }
      }

      if (rawConfig.AUTO_READ) {
        await sock.readMessages([mek.key]);
      }

      if (rawConfig.AUTO_REACT) {
        try {
          await sock.sendMessage(mek.key.remoteJid, {
            react: {
              text: "✅",
              key: mek.key,
            },
          });
        } catch (e) {
          console.error("Auto react failed:", e.message);
        }
      }

      mek.message =
        getContentType(mek.message) === "ephemeralMessage"
          ? mek.message.ephemeralMessage.message
          : mek.message;

      const m = sms(sock, mek);
      const type = getContentType(mek.message);
      const from = mek.key.remoteJid;
      if (from === "status@broadcast") return;

      const body =
        type === "conversation"
          ? mek.message.conversation
          : type === "extendedTextMessage"
          ? mek.message.extendedTextMessage.text
          : type === "imageMessage"
          ? mek.message.imageMessage.caption
          : type === "videoMessage"
          ? mek.message.videoMessage.caption
          : "";

      const isCmd = body?.startsWith(prefix);
      const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
      const args = body.trim().split(/\s+/).slice(1);
      const q = args.join(" ");
      const isGroup = from.endsWith("@g.us");
      const sender = mek.key.fromMe
        ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
        : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split("@")[0];
      const botNumber = sock.user.id.split(":")[0];
      const pushname = mek.pushName || "Sin Nombre";
      const isMe = botNumber.includes(senderNumber);
      const isOwner = rawConfig.OWNER_NUM.includes(senderNumber) || isMe;

      const botNumber2 = await jidNormalizedUser(sock.user.id);
      const groupMetadata = isGroup ? await sock.groupMetadata(from).catch(() => null) : null;
      const groupName = groupMetadata?.subject || "";
      const participants = groupMetadata?.participants || [];
      const groupAdmins = isGroup ? await getGroupAdmins(participants) : [];
      const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
      const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

      const reply = (text) => sock.sendMessage(from, { text }, { quoted: mek });

      if (!isOwner && envConfig.MODE === "private") return;
      if (!isOwner && isGroup && envConfig.MODE === "inbox") return;
      if (!isOwner && !isGroup && envConfig.MODE === "groups") return;

      sock.sendFileUrl = async (jid, url, caption = "", quoted, options = {}) => {
        try {
          const res = await axios.head(url);
          const mime = res.headers["content-type"];
          const type = mime.split("/")[0];
          const mediaData = await getBuffer(url);

          if (type === "image") {
            return sock.sendMessage(jid, { image: mediaData, caption, ...options }, { quoted });
          } else if (type === "video") {
            return sock.sendMessage(jid, { video: mediaData, caption, mimetype: "video/mp4", ...options }, { quoted });
          } else if (type === "audio") {
            return sock.sendMessage(jid, { audio: mediaData, mimetype: "audio/mpeg", ...options }, { quoted });
          } else if (mime === "application/pdf") {
            return sock.sendMessage(jid, { document: mediaData, mimetype: mime, caption, ...options }, { quoted });
          }
        } catch (err) {
          console.error("❌ sendFileUrl error:", err.message);
        }
      };

      const events = require("./command");

      if (isCmd) {
        const cmd =
          events.commands.find((c) => c.pattern === command) ||
          events.commands.find((c) => c.alias?.includes(command));
        if (cmd) {
          if (cmd.react) {
            sock.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
          }
          try {
            await cmd.function(sock, mek, m, {
              from,
              quoted: mek.quoted,
              body,
              isCmd,
              command,
              args,
              q,
              isGroup,
              sender,
              senderNumber,
              botNumber2,
              botNumber,
              pushname,
              isMe,
              isOwner,
              groupMetadata,
              groupName,
              participants,
              groupAdmins,
              isBotAdmins,
              isAdmins,
              reply,
            });
          } catch (err) {
            console.error("❌ Command error:", err.message);
          }
        }
      }

      for (const cmd of events.commands) {
        const shouldRun =
          (cmd.on === "body" && body) ||
          (cmd.on === "text" && q) ||
          (cmd.on === "image" && type === "imageMessage") ||
          (cmd.on === "sticker" && type === "stickerMessage");

        if (shouldRun) {
          try {
            await cmd.function(sock, mek, m, { from, body, q, reply });
          } catch (e) {
            console.error(`❌ Trigger error [${cmd.on}]`, e.message);
          }
        }
      }
    } catch (err) {
      console.error("❌ Message handler error:", err.message);
    }
  });
}

// ========== Express Ping ==========
app.get("/", (req, res) => {
  res.send("👻GHOST MD👻 started ✅");
});

app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});

// ========== Start Bot ==========
(async () => {
  await ensureSession();
  await connectToWA();
})();
