const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fg = require('api-dylux'); // api-dylux අවශ්‍ය වේ

const cinesubz_footer = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 © 𝟐𝟎𝟐𝟔 🇱🇰";
// ඔබේ ස්ථාවර GitHub පින්තූර ලින්ක් එක
const fixed_thumb_url = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

// ───────── Target JID ─────────
const target_group_jid = "120363423343298579@g.us";

// ───────── React helper ─────────
async function react(conn, jid, key, emoji) {
    try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ───────── Create thumbnail ─────────
async function makeThumbnail(url) {
    try {
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log("❌ Thumbnail error:", e.message);
        return null;
    }
}

// ───────── Wait for reply ─────────
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

// ───────── Send document helper (Modified for Target JID) ─────────
async function sendDocToTarget(conn, targetJid, info, file) {
    const thumb = await makeThumbnail(fixed_thumb_url); 
    const captionText = `🎬 *${info.title}*\n*${file.quality}*\n\n${cinesubz_footer}`;
    await conn.sendMessage(targetJid, {
        document: { url: file.url },
        fileName: `${info.title} (${file.quality}).mp4`.replace(/[\/\\:*?"<>|]/g,""),
        mimetype: "video/mp4",
        jpegThumbnail: thumb || undefined,
        caption: captionText
    });
}

// ───────── Command ─────────
cmd({
    pattern: "cinejid",
    desc: "CineSubz GDrive downloader with Full Details & Logs",
    category: "downloader",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❗ Example: .cinesubz Avatar");
        console.log(`\n🔍 Searching: ${q}`);
        await react(conn, from, m.key, "🔍");

        // 1️⃣ Search
        const searchRes = await axios.get(
            `https://api-dark-shan-yt.koyeb.app/movie/cinesubz-search?q=${encodeURIComponent(q)}&apikey=edbcfabbca5a9750`
        );
        
        console.log("📂 Search Results:", JSON.stringify(searchRes.data, null, 2));
        
        const results = searchRes.data?.data;
        if (!results?.length) return reply("❌ No results found");

        let listText = `🎬 *CineSubz Results*\n\n`;
        results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });

        const listMsg = await conn.sendMessage(from, {
            text: listText + `\nReply number\n\n${cinesubz_footer}`
        }, { quoted: mek });

        // 2️⃣ Select movie
        const { msg: movieMsg, text: movieText } = await waitForReply(conn, from, listMsg.key.id);
        const index = parseInt(movieText) - 1;
        if (isNaN(index) || !results[index]) return reply("❌ Invalid number");
        await react(conn, from, movieMsg.key, "🎬");

        // 3️⃣ Movie info
        const infoRes = await axios.get(
            `https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=${encodeURIComponent(results[index].link)}&apikey=edbcfabbca5a9750`
        );
        
        console.log("ℹ️ Movie Info Data:", JSON.stringify(infoRes.data, null, 2));
        
        const info = infoRes.data?.data;
        if (!info) return reply("❌ Failed to get movie info");

        let infoText = `🎬 *${info.title}*\n\n`;
        if (info.year) infoText += `📅 *Year:* ${info.year}\n`;
        if (info.rating) infoText += `⭐ *Rating:* ${info.rating}\n`;
        if (info.duration) infoText += `⏱️ *Duration:* ${info.duration}\n`;
        if (info.country) infoText += `🌍 *Country:* ${info.country}\n`;
        if (info.directors) infoText += `🎬 *Directors:* ${info.directors}\n`;
        
        infoText += `\n*Available Qualities:*`;
        info.downloads.forEach((d,i)=>{ 
            infoText += `\n*${i+1}.* ${d.quality} (${d.size})`; 
        });

        const infoMsg = await conn.sendMessage(from, {
            image: { url: info.image },
            caption: infoText + `\n\nReply download number\n${cinesubz_footer}`
        }, { quoted: movieMsg });

        // 4️⃣ Select quality
        const { msg: dlMsg, text: dlText } = await waitForReply(conn, from, infoMsg.key.id);
        const dIndex = parseInt(dlText) - 1;
        if (isNaN(dIndex) || !info.downloads[dIndex]) return reply("❌ Invalid download number");
        await react(conn, from, dlMsg.key, "⬇️");

        // 5️⃣ Get Download links from API
        const dlRes = await axios.get(
            `https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=${encodeURIComponent(info.downloads[dIndex].link)}&apikey=edbcfabbca5a9750`
        );
        
        console.log("🔗 Download Links Data:", JSON.stringify(dlRes.data, null, 2));
        
        const downloadLinks = dlRes.data?.data?.download;
        const gdrive = downloadLinks?.find(v => v.name.toLowerCase().includes("gdrive"));
        const pix = downloadLinks?.find(v => v.name.toUpperCase().includes("PIX"));

        // 6️⃣ Process and Send to Target JID
        if (gdrive) {
            try {
                console.log("🚀 Attempting GDrive Download...");
                let driveUrl = gdrive.url
                    .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
                    .replace('&export=download', '/view');

                const res = await fg.GDriveDl(driveUrl);
                const thumb = await makeThumbnail(fixed_thumb_url);

                await conn.sendMessage(target_group_jid, {
                    document: { url: res.downloadUrl },
                    fileName: res.fileName,
                    mimetype: res.mimetype,
                    jpegThumbnail: thumb || undefined,
                    caption: `🎬 *${info.title}*\n⚖️ Size: ${res.fileSize}\n\n${cinesubz_footer}`
                });

                await reply("✅ Movie sent to the target group successfully!");
                await react(conn, from, dlMsg.key, "✅");
            } catch (err) {
                console.log("⚠️ GDrive Dylux Failed, trying direct link...", err.message);
                await sendDocToTarget(conn, target_group_jid, info, { url: gdrive.url, quality: info.downloads[dIndex].quality });
                await reply("✅ Movie sent to the target group successfully!");
                await react(conn, from, dlMsg.key, "✅");
            }
        } else if (pix) {
            console.log("🚀 Sending via Pixeldrain to Target Group...");
            await sendDocToTarget(conn, target_group_jid, info, { url: pix.url, quality: info.downloads[dIndex].quality });
            await reply("✅ Movie sent to the target group successfully!");
            await react(conn, from, dlMsg.key, "✅");
        } else {
            console.log("❌ No suitable link found.");
            reply("❌ No GDrive or Pixeldrain link found.");
        }

    } catch (e) {
        console.error("📛 CRITICAL ERROR:", e);
        reply("⚠️ Error: " + e.message);
    }
});
