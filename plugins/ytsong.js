const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");

const FOOTER = "╭𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐕𝟰╮";
const TEMP_DIR = path.resolve(__dirname, "../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function listenForReplies(conn, from, sender, targetId, callback) {
    const handler = (update) => {
        const msg = update.messages?.[0];
        if (!msg?.message) return;
        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
        const context = msg.message?.extendedTextMessage?.contextInfo;
        const msgSender = msg.key.participant || msg.key.remoteJid;
        if (
            msg.key.remoteJid === from &&
            (msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid")) &&
            context?.stanzaId === targetId
        ) {
            callback({ msg, text: text.trim() });
        }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => conn.ev.off("messages.upsert", handler), 900000);
}

async function downloadFile(url, filePath) {
    const response = await axios({ method: 'get', url, responseType: 'stream', timeout: 60000 });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

cmd({
    pattern: "song",
    alias: ["audio", "play", "ytmp3"],
    react: "🎶",
    desc: "YouTube Song Downloader with Search",
    category: "download",
    filename: __filename,
}, async (bot, mek, m, { from, q, reply, sender }) => {
    try {
        let query = typeof q === "string" ? q.trim() : "";
        if (!query) return reply("❌ Please provide a song name or YouTube link.\n\n*Usage:* .song <name/link>");

        await bot.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        const search = await yts(query);
        const results = search.videos.slice(0, 10);
        if (results.length === 0) return reply("❌ No results found.");

        let listText = "🎶 *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐕𝟰 𝐒𝐎𝐍𝐆 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
        results.forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n⏱️ ${v.timestamp}\n\n`; });

        const sentSearch = await bot.sendMessage(from, {
            image: { url: results[0].thumbnail },
            caption: listText + `🔢 *Reply a number to select the song.*`
        }, { quoted: mek });

        listenForReplies(bot, from, sender, sentSearch.key.id, async (selection) => {
            const idx = parseInt(selection.text) - 1;
            if (isNaN(idx) || !results[idx]) return;

            await bot.sendMessage(from, { react: { text: "⏳", key: selection.msg.key } });
            await processAudioFlow(bot, from, sender, results[idx].url, selection.msg, results[idx]);
        });

    } catch (err) {
        console.error(err);
        reply(`❌ Error: ${err.message}`);
    }

    async function processAudioFlow(conn, from, sender, url, quotedMek, searchItem) {
        try {
            // Use yt-dlp compatible public API
            const res = await axios.get(
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                { timeout: 30000 }
            );
            const data = res.data;
            if (!data || !data.data) {
                // fallback API
                const res2 = await axios.get(
                    `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(url)}`,
                    { timeout: 30000 }
                );
                if (!res2.data?.success) return conn.sendMessage(from, { text: "❌ Download failed. Try another song." }, { quoted: quotedMek });

                const d2 = res2.data;
                const selectMsg =
                    `⫷⦁[ *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐕𝟰* ]⦁⫸\n\n` +
                    `📃 *Title:* ${d2.title || searchItem.title}\n` +
                    `⏱️ *Time:* ${searchItem.timestamp}\n\n` +
                    `*Reply number to download:*\n\n` +
                    `1 ┃ Audio 🎵\n` +
                    `2 ┃ Document 📁\n` +
                    `3 ┃ Voice Note 🎙️`;

                const sentSelect = await conn.sendMessage(from, {
                    image: { url: searchItem.thumbnail },
                    caption: selectMsg
                }, { quoted: quotedMek });

                listenForReplies(conn, from, sender, sentSelect.key.id, async (qSel) => {
                    if (!["1","2","3"].includes(qSel.text)) return;
                    await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });

                    const filePath = path.join(TEMP_DIR, `audio_${Date.now()}.mp3`);
                    await downloadFile(d2.downloadUrl, filePath);

                    let audioConfig = {};
                    if (qSel.text === "1") audioConfig = { audio: fs.readFileSync(filePath), mimetype: "audio/mpeg" };
                    else if (qSel.text === "2") audioConfig = { document: fs.readFileSync(filePath), mimetype: "audio/mpeg", fileName: `${d2.title || "song"}.mp3`, caption: FOOTER };
                    else if (qSel.text === "3") audioConfig = { audio: fs.readFileSync(filePath), mimetype: "audio/ogg; codecs=opus", ptt: true };

                    await conn.sendMessage(from, audioConfig, { quoted: qSel.msg });
                    await conn.sendMessage(from, { react: { text: "✅", key: qSel.msg.key } });
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
                return;
            }

            const d = data.data;
            const selectMsg =
                `⫷⦁[ *𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃 𝐕𝟰* ]⦁⫸\n\n` +
                `📃 *Title:* ${d.title || searchItem.title}\n` +
                `⏱️ *Time:* ${searchItem.timestamp}\n\n` +
                `*Reply number to download:*\n\n` +
                `1 ┃ Audio 🎵\n` +
                `2 ┃ Document 📁\n` +
                `3 ┃ Voice Note 🎙️`;

            const sentSelect = await conn.sendMessage(from, {
                image: { url: searchItem.thumbnail },
                caption: selectMsg
            }, { quoted: quotedMek });

            listenForReplies(conn, from, sender, sentSelect.key.id, async (qSel) => {
                if (!["1","2","3"].includes(qSel.text)) return;
                await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });

                const filePath = path.join(TEMP_DIR, `audio_${Date.now()}.mp3`);
                await downloadFile(d.url || d.mp3, filePath);

                let audioConfig = {};
                if (qSel.text === "1") audioConfig = { audio: fs.readFileSync(filePath), mimetype: "audio/mpeg" };
                else if (qSel.text === "2") audioConfig = { document: fs.readFileSync(filePath), mimetype: "audio/mpeg", fileName: `${d.title || "song"}.mp3`, caption: FOOTER };
                else if (qSel.text === "3") audioConfig = { audio: fs.readFileSync(filePath), mimetype: "audio/ogg; codecs=opus", ptt: true };

                await conn.sendMessage(from, audioConfig, { quoted: qSel.msg });
                await conn.sendMessage(from, { react: { text: "✅", key: qSel.msg.key } });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });

        } catch (e) {
            console.error("Audio flow error:", e.message);
            conn.sendMessage(from, { text: "❌ Download failed. Please try again." }, { quoted: quotedMek });
        }
    }
});
