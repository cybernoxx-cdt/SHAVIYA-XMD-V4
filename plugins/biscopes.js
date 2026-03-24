const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');

const FOOTER = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 © 𝟐𝟎𝟐𝟔 🌏";
const API_BASE = "https://biscopes.vercel.app";
const fixed_thumb_url = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

// React helper
async function react(conn, jid, key, emoji) {
    try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// Thumbnail
async function makeThumbnail(url) {
    try {
        const img = await axios.get(url, { responseType: "arraybuffer" });
        return await sharp(img.data).resize(300).jpeg({ quality: 60 }).toBuffer();
    } catch { return null; }
}

// Wait reply
function waitForReply(conn, from, replyToId, timeout = 120000) {
    return new Promise((resolve, reject) => {
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const ctx = msg.message?.extendedTextMessage?.contextInfo;
            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text;

            if (msg.key.remoteJid === from && ctx?.stanzaId === replyToId) {
                conn.ev.off("messages.upsert", handler);
                resolve({ msg, text });
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
            reject(new Error("Reply timeout"));
        }, timeout);
    });
}

cmd({
    pattern: "baiscope",
    desc: "Baiscopes.lk Downloader",
    category: "downloader",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {

try {

if (!q) return reply("❗ Example: .baiscope Avatar");

await react(conn, from, m.key, "🔍");

// 1️⃣ SEARCH
const search = await axios.get(`${API_BASE}?action=search&query=${encodeURIComponent(q)}`);
const results = search.data.data;

if (!results?.length) return reply("❌ No results found");

let list = `🎬 *Baiscopes Results*\n\n`;
results.slice(0, 10).forEach((v, i) => {
    list += `*${i+1}.* ${v.title}\n`;
});

const listMsg = await conn.sendMessage(from, {
    text: list + `\nReply number\n\n${FOOTER}`
}, { quoted: mek });

// 2️⃣ SELECT MOVIE
const { msg: movieMsg, text } = await waitForReply(conn, from, listMsg.key.id);
const index = parseInt(text) - 1;

if (isNaN(index) || !results[index]) return reply("❌ Invalid number");

await react(conn, from, movieMsg.key, "🎬");

const movieUrl = results[index].link;

// 3️⃣ DETAILS
const details = await axios.get(`${API_BASE}?action=details&url=${encodeURIComponent(movieUrl)}`);
const info = details.data.data;

if (!info?.downloads?.length) return reply("❌ No downloads found");

let qualityList = `🎬 *${info.title}*\n\n*Available Qualities:*\n`;
info.downloads.forEach((d, i) => {
    qualityList += `\n*${i+1}.* ${d.quality} (${d.size})`;
});

const qualityMsg = await conn.sendMessage(from, {
    text: qualityList + `\n\nReply download number\n${FOOTER}`
}, { quoted: movieMsg });

// 4️⃣ SELECT QUALITY
const { msg: dlMsg, text: qText } = await waitForReply(conn, from, qualityMsg.key.id);
const qIndex = parseInt(qText) - 1;

if (isNaN(qIndex) || !info.downloads[qIndex]) 
    return reply("❌ Invalid quality number");

await react(conn, from, dlMsg.key, "⬇️");

const downloadPage = info.downloads[qIndex].link;

// 5️⃣ EXTRACT DIRECT LINK
const dlRes = await axios.get(`${API_BASE}?action=download&url=${encodeURIComponent(downloadPage)}`);

if (!dlRes.data.status) 
    return reply("❌ Direct link not found");

const directLink = dlRes.data.direct_link;

// 6️⃣ If Pixeldrain convert to API link
let finalLink = directLink;

if (directLink.includes("pixeldrain.com/u/")) {
    const fileId = directLink.split("/").pop();
    finalLink = `https://pixeldrain.com/api/file/${fileId}?download`;
}

const thumb = await makeThumbnail(fixed_thumb_url);

// 7️⃣ SEND FILE
await conn.sendMessage(from, {
    document: { url: finalLink },
    mimetype: "video/mp4",
    fileName: `${info.title}.mp4`.replace(/[\/\\:*?"<>|]/g,""),
    jpegThumbnail: thumb || undefined,
    caption: `🎬 *${info.title}*\n${info.downloads[qIndex].quality}\n\n${FOOTER}`
}, { quoted: dlMsg });

await react(conn, from, dlMsg.key, "✅");

} catch (e) {
    console.error(e);
    reply("⚠️ Error: " + e.message);
}

});
