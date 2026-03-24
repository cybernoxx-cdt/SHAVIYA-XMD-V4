const { cmd } = require("../command");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");
const ffmpegPath = require("ffmpeg-static");
const { isOwner } = require("../lib/auth");

const API_KEY = "darkshan-75704c1b";
const cookiesPath = path.resolve(__dirname, "../cookies/pornhubcookies.txt");
const tempDir = path.resolve(__dirname, "../temp");

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function findFile(dir, pattern) {
  return fs.readdirSync(dir).find(f => f.includes(pattern));
}

function safeName(name, max = 60) {
  return String(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "").slice(0, max);
}

// ───────── React Helper ─────────
async function sendReact(conn, from, key, emoji) {
    try { await conn.sendMessage(from, { react: { text: emoji, key } }); } catch {}
}

// ───────── Multi-Reply Waiter ─────────
function waitForReply(conn, from, sender, targetId) {
    return new Promise((resolve) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;
            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");

            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        // විනාඩි 10ක් යනකම් reply වලට සවන් දෙයි
        setTimeout(() => { conn.ev.off("messages.upsert", handler); }, 600000); 
    });
}

cmd(
  {
    pattern: "pornhub",
    alias: ["ph", "pornhubdl"],
    ownerOnly: true,
    react: "💦",
    desc: "PH Downloader with Double Reply Quality Selector, Reacts & Doc Thumbnail",
    category: "download",
    filename: __filename,
  },
  async (robin, mek, m, { from, q, reply, sender }) => {
    try {
      let query = typeof q === "string" ? q.trim() : "";
      if (!query) return reply("❌ Please provide a link or search query.");

      // --- 1. SEARCH LOGIC ---
      if (!query.includes("pornhub.com")) {
          const searchRes = await axios.get(`https://sayuradark-api-two.vercel.app/api/other/pornhub/search?apikey=${API_KEY}&q=${encodeURIComponent(query)}`);
          const results = searchRes.data?.result;
          if (!results || results.length === 0) return reply("❌ No results found.");

          let listText = "🔞 *SHAVIYA-XMD V4 𝐏𝐎𝐑𝐇𝐔𝐁*\n\n";
          results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n⏱️ ${v.duration}\n\n`; });
          const sentSearch = await robin.sendMessage(from, { text: listText + `අංකය Reply කරන්න.` }, { quoted: mek });

          // --- MULTIPLY (INFINITE LOOP) ADDED HERE ---
          const startFlow = async () => {
              while (true) {
                  const selection = await waitForReply(robin, from, sender, sentSearch.key.id);
                  if (!selection) break; // Timeout වුණොත් නතර වේ

                  (async () => {
                      const idx = parseInt(selection.text) - 1;
                      if (results[idx]) {
                          // 2. QUALITY SELECTOR REPLY
                          let qText = `🎥 *${results[idx].title}*\n\n*Quality එක තෝරන්න:*\n1. 1080p\n2. 720p\n3. 480p\n4. 360p`;
                          const sentQual = await robin.sendMessage(from, { text: qText }, { quoted: selection.msg });

                          const qSelection = await waitForReply(robin, from, sender, sentQual.key.id);
                          if (qSelection) {
                              const qMap = { "1": "1080", "2": "720", "3": "480", "4": "360" };
                              const chosenQ = qMap[qSelection.text] || "720";
                              await handleDownload(robin, from, `${chosenQ}p ${results[idx].url}`, qSelection.msg);
                          }
                      }
                  })();
              }
          };
          return startFlow();
      }

      // Direct Link Download
      await handleDownload(robin, from, query, mek);

    } catch (err) {
      reply(`❌ Error: ${err.message}`);
    }

    /**
     * ==================================================
     * 🔹 PH DOWNLOAD ENGINE (YOUR ORIGINAL LOGIC - UNCHANGED)
     * ==================================================
     */
    async function handleDownload(conn, from, qInput, quotedMek) {
      const dlId = Date.now();
      try {
        await sendReact(conn, from, quotedMek.key, "⏳");
        
        let quality = 720; 
        let currentQ = qInput;
        const parts = currentQ.split(/\s+/);
        if (parts.length > 1) {
          let first = parts[0].toLowerCase().replace("p", "");
          if (["360","480","720","1080"].includes(first)) {
            quality = parseInt(first);
            currentQ = parts.slice(1).join(" "); 
          }
        }

        if (!currentQ.includes("pornhub.com")) return;
        if (!fs.existsSync(cookiesPath)) return conn.sendMessage(from, { text: "⚠️ Cookies not found." });

        const outputTemplate = path.join(tempDir, `ph_${dlId}_%(id)s.%(ext)s`);

        /* PHASE 1: METADATA + THUMBNAIL (ORIGINAL ARGS) */
        const metaArgs = ["--skip-download", "--no-warnings", "--cookies", cookiesPath, "--ffmpeg-location", ffmpegPath, "--write-thumbnail", "--convert-thumbnails", "jpg", "--write-info-json", "-o", outputTemplate, currentQ];
        await new Promise((res, rej) => execFile("yt-dlp", metaArgs, err => err ? rej(err) : res()));

        const infoFile = findFile(tempDir, `ph_${dlId}_`) && findFile(tempDir, ".info.json");
        const thumbFile = findFile(tempDir, `ph_${dlId}_`) && findFile(tempDir, ".jpg");
        const info = JSON.parse(fs.readFileSync(path.join(tempDir, infoFile), "utf8"));
        const selectedQuality = info.height ? `${Math.min(info.height, quality)}p` : `${quality}p`;

        if (thumbFile) {
          await conn.sendMessage(from, {
              image: fs.readFileSync(path.join(tempDir, thumbFile)),
              caption: `👻 *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 PH DOWNLOADER*\n\n🎥 *Title:* ${info.title}\n📦 *Quality:* ${selectedQuality}\n\n📥 *Downloading video…*`,
          }, { quoted: quotedMek });
        }

        /* PHASE 2: VIDEO DOWNLOAD (ARIA2C, FRAGMENTS - ORIGINAL ARGS) */
        await sendReact(conn, from, quotedMek.key, "📥");
        const videoArgs = ["--no-warnings", "--cookies", cookiesPath, "--ffmpeg-location", ffmpegPath, "-f", `bv*[height<=${quality}]+ba/best[height<=${quality}]/best`, "--merge-output-format", "mp4", "--concurrent-fragments", "16", "--downloader", "aria2c", "--downloader-args", "aria2c:-x 8 -s 8 -k 1M", "-o", outputTemplate, currentQ];
        await new Promise((res, rej) => execFile("yt-dlp", videoArgs, err => err ? rej(err) : res()));

        const videoFileName = findFile(tempDir, `ph_${dlId}_`) && findFile(tempDir, ".mp4");
        const docThumb = thumbFile ? await sharp(path.join(tempDir, thumbFile)).resize(300).jpeg({ quality: 65 }).toBuffer() : undefined;

        const sentDoc = await conn.sendMessage(from, {
            document: fs.readFileSync(path.join(tempDir, videoFileName)),
            mimetype: "video/mp4",
            fileName: `${safeName(info.title)}_${selectedQuality}.mp4`,
            jpegThumbnail: docThumb,
            caption: `🎬 *${info.title}*\n📦 Quality: ${selectedQuality}\n\n SHAVIYA-XMD V4 𝐏𝐎𝐑𝐍 𝐇𝐔𝐁 💦`
        }, { quoted: quotedMek });

        await sendReact(conn, from, sentDoc.key, "✅");

        // CLEANUP
        fs.readdirSync(tempDir).forEach(f => { if (f.includes(`ph_${dlId}`)) fs.unlink(path.join(tempDir, f), () => {}); });

      } catch (e) {
        conn.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: quotedMek });
      }
    }
  }
);
