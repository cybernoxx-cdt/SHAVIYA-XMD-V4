// ================= Required Modules =================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
  generateWAMessageFromContent,
} = require("@whiskeysockets/baileys");

// ── Suppress libsignal / Baileys noise logs ──
const _origWrite = process.stdout.write.bind(process.stdout);
const _origErrWrite = process.stderr.write.bind(process.stderr);
const SUPPRESS_PATTERNS = [
  "Bad MAC","Failed to decrypt","Session error","Closing open session",
  "Closing session","Decrypted message with closed session","closed session",
  "SessionEntry","no session","No session","Invalid PreKey",
  "decryptWithSessions","ephemeralKeyPair","lastRemoteEphemeralKey",
  "pendingPreKey","remoteIdentityKey","currentRatchet","indexInfo",
  "baseKeyType","_chains","registrationId","useNewUrlParser",
  "useUnifiedTopology","session_cipher","queue_job",
  "verifyMAC","at async _asyncQueue","at async SessionCipher","at Object.verifyMAC",
];
function shouldSuppress(str) {
  if (typeof str !== "string") return false;
  return SUPPRESS_PATTERNS.some(p => str.includes(p));
}
process.stdout.write = function(chunk, encoding, cb) {
  try {
    if (shouldSuppress(String(chunk))) {
      if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      return true;
    }
    return _origWrite(chunk, encoding, cb);
  } catch (e) { return true; }
};
process.stderr.write = function(chunk, encoding, cb) {
  try {
    if (shouldSuppress(String(chunk))) {
      if (typeof encoding === "function") encoding();
      else if (typeof cb === "function") cb();
      return true;
    }
    return _origErrWrite(chunk, encoding, cb);
  } catch (e) { return true; }
};

const fs      = require("fs");
const P       = require("pino");
const path    = require("path");
const express = require("express");
const config  = require("./config");
const { File } = require("megajs");

// lib modules — lazy load
let sms;
let antidelete, handleAutoForward;

// ================= Global Variables =================
const ownerNumber = [config.OWNER_NUMBER || "94707085822"];
const botName = "SHAVIYA-XMD V4";
let activeSessions = new Set();
const reconnectingSessions = new Set();
const sentConnectMsg = new Set();

// ================= Bot Context (Fake ID) =================
const chama = {
  key: { remoteJid:"status@broadcast", participant:"0@s.whatsapp.net", fromMe:false, id:"META_AI_FAKE_ID_TS" },
  message: {
    contactMessage: {
      displayName: botName,
      vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`,
    },
  },
};

// ====================== MEGA SESSION DOWNLOADER ======================
// SHAVIYA-XMD V4 RULE:
//   plugins/ and lib/ are BUNDLED LOCALLY — never downloaded from MEGA.
//   Only the session (creds.json) may come from MEGA when SESSION_ID is a MEGA link.

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function downloadMegaNode(node, targetPath) {
  if (node.directory) {
    ensureDirSync(targetPath);
    for (const child of (node.children || [])) {
      await downloadMegaNode(child, path.join(targetPath, child.name));
    }
    return;
  }
  ensureDirSync(path.dirname(targetPath));
  if (fs.existsSync(targetPath) && node.size) {
    if (fs.statSync(targetPath).size >= node.size) return;
  }
  await new Promise((resolve, reject) => {
    const stream = node.download();
    const w = fs.createWriteStream(targetPath);
    stream.on("error", reject);
    w.on("error", reject);
    w.on("finish", resolve);
    stream.pipe(w);
  });
}

// ====================== BASE64 / MEGA SESSION LOADER ======================
async function loadSession() {
  let sessionId = config.SESSION_ID;
  if (!sessionId) {
    console.log("[SHAVIYA-XMD V4] No SESSION_ID found. Please set it in .env or platform env vars.");
    return false;
  }

  const authDir   = path.join(__dirname, "auth_info_baileys");
  ensureDirSync(authDir);
  const credsPath = path.join(authDir, "creds.json");

  // If valid creds already exist, skip loading
  if (fs.existsSync(credsPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      if (existing && existing.noiseKey) {
        console.log("[SESSION] Valid creds.json found — skipping decode.");
        return true;
      }
    } catch {}
  }

  // ── Option 1: MEGA link ──
  if (sessionId.startsWith("https://mega.nz") || sessionId.startsWith("mega://")) {
    try {
      console.log("[SESSION] Downloading session from MEGA...");
      const megaFile = File.fromURL(sessionId);
      await megaFile.loadAttributes();
      if (megaFile.directory) {
        await downloadMegaNode(megaFile, authDir);
      } else {
        await new Promise((resolve, reject) => {
          const stream = megaFile.download();
          const w = fs.createWriteStream(credsPath);
          stream.on("error", reject);
          w.on("error", reject);
          w.on("finish", resolve);
          stream.pipe(w);
        });
      }
      console.log("[SESSION] MEGA session downloaded successfully.");
      return true;
    } catch (e) {
      console.log("[SESSION] MEGA download failed:", e.message);
      return false;
    }
  }

  // ── Option 2: Base64-encoded creds.json ──
  try {
    let raw = sessionId.trim();
    for (const prefix of ["SHAVIYA-XMD_","ranu&","HASIYA_","shavi&"]) {
      if (raw.startsWith(prefix)) { raw = raw.slice(prefix.length); break; }
    }
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const parsed  = JSON.parse(decoded);
    if (!parsed || !parsed.noiseKey) throw new Error("Missing noiseKey — not valid creds");
    fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));
    console.log("[SESSION] Base64 session decoded → auth_info_baileys/creds.json");
    return true;
  } catch (e) {
    console.log("[SESSION] Base64 decode failed:", e.message);
  }

  // ── Option 3: Raw JSON string ──
  try {
    const parsed = JSON.parse(sessionId);
    if (parsed && parsed.noiseKey) {
      fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));
      console.log("[SESSION] Raw JSON session saved.");
      return true;
    }
  } catch {}

  console.log("[SESSION] Could not load session. Set SESSION_ID to a base64 string or MEGA link.");
  return false;
}

// ====================== BOOT: ensure folders & session ======================
async function ensureBotFiles() {
  // Only ensure local folders exist — plugins and lib come bundled, NOT from MEGA
  ["plugins","lib","data","cookies","auth_info_baileys"].forEach(f =>
    ensureDirSync(path.join(__dirname, f))
  );
  console.log("[SHAVIYA-XMD V4] Local folders verified.");
  await loadSession();
}

// ====================== LOCAL SESSION FINDER ======================
function loadLocalSessions() {
  const baseDir = path.join(__dirname, "auth_info_baileys");
  const sessions = [];
  if (!fs.existsSync(baseDir)) {
    console.log("auth_info_baileys folder not found.");
    return sessions;
  }
  const rootCreds = path.join(baseDir, "creds.json");
  if (fs.existsSync(rootCreds)) {
    sessions.push({ sessionId: "main", authPath: baseDir });
    console.log("Single session found: main");
    return sessions;
  }
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subPath  = path.join(baseDir, entry.name);
    const credFile = path.join(subPath, "creds.json");
    if (fs.existsSync(credFile)) {
      sessions.push({ sessionId: entry.name, authPath: subPath });
      console.log(`Session found: ${entry.name}`);
    }
  }
  return sessions;
}

// ================= Body Extractor =================
function extractBody(message) {
  if (!message) return "";
  const type = getContentType(message);
  if (type === "conversation")               return message.conversation || "";
  if (type === "extendedTextMessage")        return message.extendedTextMessage?.text || "";
  if (type === "buttonsResponseMessage")     return message.buttonsResponseMessage?.selectedButtonId || "";
  if (type === "listResponseMessage")        return message.listResponseMessage?.singleSelectReply?.selectedRowId || "";
  if (type === "templateButtonReplyMessage") return message.templateButtonReplyMessage?.selectedId || "";
  if (type === "interactiveResponseMessage") {
    try {
      const nativeReply = message.interactiveResponseMessage?.nativeFlowResponseMessage;
      if (nativeReply) {
        const parsed = JSON.parse(nativeReply.paramsJson || "{}");
        return parsed.id || nativeReply.name || "";
      }
    } catch {}
    return message.interactiveResponseMessage?.body?.text || "";
  }
  if (type === "imageMessage") return message.imageMessage?.caption || "";
  if (type === "videoMessage") return message.videoMessage?.caption || "";
  return "";
}

// ================= Global Button State =================
const buttonStateMap = new Map();
const buttonStateDir = path.join(__dirname, "./data");

function getButtonStateFile(sid) {
  return path.join(buttonStateDir, "button_state_" + sid + ".json");
}

global.isButtonEnabled = function(sessionId) {
  if (buttonStateMap.has(sessionId)) return buttonStateMap.get(sessionId);
  try {
    const file = getButtonStateFile(sessionId);
    if (fs.existsSync(file)) {
      const val = JSON.parse(fs.readFileSync(file, "utf8")).enabled;
      buttonStateMap.set(sessionId, val);
      return val;
    }
  } catch {}
  return true;
};

global.setButtonState = function(sessionId, value) {
  buttonStateMap.set(sessionId, value);
  try {
    if (!fs.existsSync(buttonStateDir)) fs.mkdirSync(buttonStateDir, { recursive: true });
    fs.writeFileSync(getButtonStateFile(sessionId), JSON.stringify({ enabled: value }, null, 2));
  } catch (e) { console.error("Button state save error:", e.message); }
};

function buildFallback(options) {
  let text = "";
  if (options.header) text += `*${options.header}*\n\n`;
  text += (options.body || "");
  if (options.buttons?.length) {
    text += "\n\n";
    options.buttons.forEach((b, i) => { text += `*${i + 1}.* ${b.text}\n`; });
    text += "\n_Reply with number_";
  }
  if (options.sections?.length) {
    text += "\n\n";
    let c = 1;
    options.sections.forEach(sec => {
      if (sec.title) text += `*${sec.title}*\n`;
      sec.rows?.forEach(row => {
        text += `*${c}.* ${row.title}`;
        if (row.description) text += ` — ${row.description}`;
        text += "\n";
        c++;
      });
    });
    text += "\n_Reply with number_";
  }
  if (options.footer) text += `\n\n${options.footer}`;
  return text;
}

global.sendInteractiveButtons = async function(conn, jid, options, quotedMsg) {
  const _sid = options._sessionId;
  if (!global.isButtonEnabled(_sid)) {
    return await conn.sendMessage(jid, { text: buildFallback(options) }, { quoted: quotedMsg });
  }
  try {
    const buttons = [];
    if (options.buttons?.length) {
      options.buttons.forEach(btn => {
        buttons.push({ name: "cta_reply", buttonParamsJson: JSON.stringify({ display_text: btn.text, id: btn.id }) });
      });
    }
    if (options.sections?.length) {
      buttons.push({ name: "single_select", buttonParamsJson: JSON.stringify({ title: options.listTitle || "Select", sections: options.sections }) });
    }
    if (options.url) {
      buttons.push({ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: options.url.text || "Open Link", url: options.url.link, merchant_url: options.url.link }) });
    }
    if (options.copy) {
      buttons.push({ name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: options.copy.text || "Copy", copy_code: options.copy.value }) });
    }
    const interactiveMsg = generateWAMessageFromContent(jid, {
      messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
      interactiveMessage: proto.Message.InteractiveMessage.create({
        body:   proto.Message.InteractiveMessage.Body.create({ text: options.body || "" }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: options.footer || botName }),
        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false, title: options.header || "" }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons, messageParamsJson: "" })
      })
    }, { quoted: quotedMsg, userJid: conn.user?.id });
    await conn.relayMessage(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id });
    return interactiveMsg;
  } catch (err) {
    console.error("Interactive Button Error:", err.message);
    return await conn.sendMessage(jid, { text: buildFallback(options) }, { quoted: quotedMsg });
  }
};

// ================= Anti-Spam Cooldown (Private Mode) =================
const _accessDeniedCooldown = new Map();
const ACCESS_DENIED_COOLDOWN_MS = 60 * 1000;

function shouldSendDenied(sid, num) {
  const key = `${sid}:${num}`;
  const last = _accessDeniedCooldown.get(key) || 0;
  if (Date.now() - last < ACCESS_DENIED_COOLDOWN_MS) return false;
  _accessDeniedCooldown.set(key, Date.now());
  return true;
}

// ================= Single Bot Instance Start =================
async function startBot(sessionId, authPath, envConfig) {
  if (activeSessions.has(sessionId)) return;
  activeSessions.add(sessionId);

  const prefix = envConfig?.PREFIX || ".";
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: false,
    auth: state,
    version,
  });

  console.log(`Starting session: ${sessionId}`);

  if (!global._activeConns) global._activeConns = new Map();
  global._activeConns.set(sessionId, conn);

  conn.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(`Reconnecting: ${sessionId}`);
        activeSessions.delete(sessionId);
        reconnectingSessions.add(sessionId);
        setTimeout(async () => {
          await startBot(sessionId, authPath, envConfig);
          reconnectingSessions.delete(sessionId);
        }, 8000);
      } else {
        console.log(`Logged Out: ${sessionId}`);
        activeSessions.delete(sessionId);
      }
    } else if (connection === "open") {
      console.log(`Connected: ${sessionId} (${conn.user.id.split(":")[0]})`);
      if (!global._activeConns) global._activeConns = new Map();
      global._activeConns.set(sessionId, conn);
      if (typeof global.attachCinesubzListener === 'function') {
        global.attachCinesubzListener(conn, sessionId);
      }

      // ── Anti-spam: only ONE connect message per session per process lifetime ──
      if (!sentConnectMsg.has(sessionId)) {
        sentConnectMsg.add(sessionId);

        // Small delay so socket is fully stable before sending
        await new Promise(r => setTimeout(r, 3000));

        const now = new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Colombo',
          hour: '2-digit', minute: '2-digit',
          day: '2-digit', month: 'short', year: 'numeric'
        });

        const botNum = conn.user.id.split(":")[0];

        const upMsg =
`╔══════════════════════════╗
║ 💎 *SHAVIYA-XMD V4 CONNECTED* 💎 ║
╚══════════════════════════╝
│
├─ 🤖 *Bot*      ➠ SHAVIYA-XMD V4
├─ 🧩 *Prefix*   ➠ [ ${prefix} ]
├─ 💎 *Version*  ➠ V2
├─ 📱 *Number*   ➠ +${botNum}
├─ ⚡ *Status*   ➠ Online ✅
├─ 🕐 *Time*     ➠ ${now}
│
├────────────────────────────
│
├─ 🛡️ *Security*  ➠ Active
├─ 🌐 *Mode*      ➠ ${(config.MODE || "public").toUpperCase()}
├─ 🎯 *Platform*  ➠ WhatsApp MD
├─ ⚙️ *Engine*    ➠ GOD ⚡
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━⊷
> ✨ *𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗫𝗠𝗗 𝗩𝟯 · 𝗣𝗥𝗘𝗠𝗜𝗨𝗠* 💎`;

        try {
          await conn.sendMessage(
            ownerNumber[0] + "@s.whatsapp.net",
            {
              image: { url: "https://files.catbox.moe/z2hr0o.jpg" },
              caption: upMsg,
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363421386030144@newsletter',
                  newsletterName: "💎 SHAVIYA-XMD V4",
                  serverMessageId: 143
                }
              }
            },
            { quoted: chama }
          );
        } catch (e) {
          console.log(`[CONNECT MSG] Failed to send: ${e.message}`);
        }

        try { await conn.newsletterFollow(`0029Vb7Cx5gJENxwXCJaXk2I@newsletter`); } catch (e) {}
      }
    }
  });

  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("messages.update", async (updates) => {
    if (antidelete) await antidelete.onDelete(conn, updates, sessionId);
  });

  conn.ev.on("messages.upsert", async (mkk) => {
    try {
      let mek = mkk.messages[0];
      if (!mek?.message) return;

      const msgKeys = Object.keys(mek.message);
      if (
        msgKeys.includes("senderKeyDistributionMessage") ||
        msgKeys.includes("protocolMessage") ||
        (msgKeys.length === 1 && msgKeys[0] === "messageContextInfo")
      ) return;

      mek.message = getContentType(mek.message) === "ephemeralMessage"
        ? mek.message.ephemeralMessage?.message || mek.message
        : mek.message;

      if (!mek.message) return;

      try { if (antidelete) await antidelete.onMessage(conn, mek, sessionId); } catch {}
      if (handleAutoForward) try { await handleAutoForward(conn, mek, sessionId); } catch {}

      const m    = sms(conn, mek);
      const from = mek.key.remoteJid;
      if (!from) return;

      const body        = extractBody(mek.message);
      const isCmd       = body.startsWith(prefix);
      const commandText = isCmd ? body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase() : "";
      const args        = body.trim().split(/ +/).slice(1);
      const q           = args.join(" ");

      const sender       = mek.key.fromMe
        ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
        : mek.key.participant || mek.key.remoteJid;
      const senderNumber = sender.split("@")[0].split(":")[0];
      const botNumber    = conn.user.id.split(":")[0].split("@")[0];
      const isOwner      = ownerNumber.map(n => n.replace(/[^0-9]/g, '')).includes(senderNumber) || botNumber === senderNumber;
      const reply        = (text) => conn.sendMessage(from, { text }, { quoted: mek });

      if (isCmd) console.log(`[CMD] ${sessionId} | ${commandText} | sender: ${senderNumber} | isOwner: ${isOwner}`);

      // ================= ACCESS CONTROL =================
      const _hasActiveState = typeof global._cinesubzHasState === "function"
        ? global._cinesubzHasState(from, sessionId)
        : false;

      if (!isOwner && !_hasActiveState && typeof global.checkAccess === "function") {
        const isGroup = from.endsWith("@g.us");
        const access  = global.checkAccess(sessionId, senderNumber, isOwner, isGroup);
        if (!access.allowed) {
          if (isCmd && shouldSendDenied(sessionId, senderNumber)) {
            await conn.sendMessage(from, { text: access.reason }, { quoted: mek });
          }
          return;
        }
      }

      // ================= Built-in Restart Command =================
      if (isCmd && commandText === "restart") {
        if (!isOwner) {
          return reply("❌ Only the bot owner can use this command.");
        }
        await conn.sendMessage(from, { text: "🔄 *SHAVIYA-XMD V4* is restarting...\n\n_Please wait a few seconds._" }, { quoted: mek });
        setTimeout(() => process.exit(0), 2000);
        return;
      }

      conn.sendButton = (jid, options, quoted) =>
        global.sendInteractiveButtons(conn, jid, { ...options, _sessionId: sessionId }, quoted || mek);

      const events = require("./command");

      if (!global._pluginsLoaded || events.commands.length === 0) {
        setTimeout(async () => {
          const ev2 = require("./command");
          if (!ev2.commands.length) return;
          const cmd2 = ev2.commands.find(c => c.pattern === commandText || (c.alias && c.alias.includes(commandText)));
          if (cmd2) {
            if (cmd2.react) conn.sendMessage(from, { react: { text: cmd2.react, key: mek.key } });
            try {
              await cmd2.function(conn, mek, m, { from, body, isCmd, command: commandText, args, q, sender, senderNumber, botNumber, isOwner, reply, sessionId });
            } catch (e) { console.error(`[CMD RETRY ERROR] ${sessionId}:`, e.message); }
          }
        }, 10000);
        return;
      }

      const cmd = events.commands.find(c => c.pattern === commandText || (c.alias && c.alias.includes(commandText)));

      if (cmd) {
        if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          await cmd.function(conn, mek, m, { from, body, isCmd, command: commandText, args, q, sender, senderNumber, botNumber, isOwner, reply, sessionId });
        } catch (err) {
          console.error(`[CMD ERROR] ${sessionId}:`, err);
        }
      }

      // ── on:"body" handlers (auto-voice, auto-typing, auto-recording etc.) ──
      const bodyHandlers = events.commands.filter(c => c.on === "body");
      for (const handler of bodyHandlers) {
        try {
          await handler.function(conn, mek, m, { from, body, isCmd, command: commandText, args, q, sender, senderNumber, botNumber, isOwner, reply, sessionId });
        } catch (err) {
          // silent fail — don't crash bot on listener errors
        }
      }
    } catch (err) {
      if (!err.message?.includes("Bad MAC") && !err.message?.includes("decrypt")) {
        console.error(`[MSG ERROR] ${sessionId}:`, err.message);
      }
    }
  });
}

// ================= Express Server =================
const app  = express();
const port = process.env.PORT || 8000;
app.get("/", (req, res) => res.send(`💎 SHAVIYA-XMD V4 is Running ✅ | Active sessions: ${activeSessions.size}`));
app.listen(port, () => console.log(`🚀 SHAVIYA-XMD V4 Server running on port ${port}`));

// ================= Plugin Loader =================
function loadPlugins() {
  if (global._pluginsLoaded) return;
  global._pluginsLoaded = true;
  try { delete require.cache[require.resolve("./command")]; } catch {}
  const pluginFolder = "./plugins/";
  let loadedCount = 0;
  if (fs.existsSync(pluginFolder)) {
    fs.readdirSync(pluginFolder).forEach(plugin => {
      if (path.extname(plugin).toLowerCase() === ".js") {
        try {
          delete require.cache[require.resolve(pluginFolder + plugin)];
          require(pluginFolder + plugin);
          loadedCount++;
        } catch (e) { console.log(`Plugin load error [${plugin}]:`, e.message); }
      }
    });
  }
  console.log(`✅ Loaded ${loadedCount} plugins, ${require("./command").commands.length} commands`);

  if (typeof global.attachCinesubzListener === 'function') {
    for (const [sessionId, conn] of global._activeConns || []) {
      try {
        global.attachCinesubzListener(conn, sessionId);
        console.log(`[CINESUBZ] Listener attached for session: ${sessionId}`);
      } catch (e) {}
    }
  }
}

// ================= Main Connector =================
async function connectToWA() {
  try {
    const envConfig = config;
    const sessions = loadLocalSessions();
    if (sessions.length === 0) {
      console.log("No sessions found in auth_info_baileys.");
      console.log("→ Set SESSION_ID in .env (base64 creds or MEGA link) and restart.");
      return;
    }
    await Promise.all(sessions.map(s => startBot(s.sessionId, s.authPath, envConfig)));
    console.log(`✅ Started ${sessions.length} session(s).`);
    setTimeout(() => loadPlugins(), 8000);
  } catch (err) {
    console.error("Startup Error:", err);
  }
}

// ================= START =================
setTimeout(async () => {
  await ensureBotFiles();
  try {
    sms        = require("./lib/msg").sms;
    antidelete = require("./plugins/antidelete");
    try { handleAutoForward = require("./plugins/tool-forward").handleAutoForward; } catch {}
    console.log("Lib modules loaded successfully.");
  } catch (e) {
    console.error("Lib load error:", e.message);
    process.exit(1);
  }
  await connectToWA();
}, 4000);
