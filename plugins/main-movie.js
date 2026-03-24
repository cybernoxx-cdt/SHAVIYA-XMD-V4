const { cmd, commands } = require("../command");
const config = require("../config");

// Movie menu timeout: 20 minutes
const MOVIE_TIMEOUT = config.MOVIE_MENU_TIMEOUT || 20 * 60 * 1000;

function waitForReply(conn, from, sender, targetId, timeout) {
    return new Promise((resolve) => {
        let resolved = false;
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;
            const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;
            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
            if (msg.key.remoteJid === from && isCorrectUser && isTargetReply) {
                resolved = true;
                conn.ev.off("messages.upsert", handler);
                resolve({ msg, text: text.trim() });
            }
        };
        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            if (!resolved) {
                conn.ev.off("messages.upsert", handler);
                resolve(null);
            }
        }, timeout);
    });
}

cmd({
    pattern: "movie",
    alias: ["films", "cinema", "sinhalafilm", "movie5"],
    desc: "🎬 All-in-one movie engine — Sinhalasub, Cinesubz, Dinka, Pirate, Lakvision & more",
    category: "downloader",
    react: "🎬",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ කරුණාකර ෆිල්ම් නම ලබා දෙන්න.\nExample: .movie Avengers");

        const posterUrl = "https://files.catbox.moe/s1pn69.jpg";

        const menu = `╭━━━〔 🎬 *SHAVIYA-XMD V4 MOVIE ENGINE* 〕━━━⬣
┃
┃ 🔍 *Search* : ${q.toUpperCase()}
┃
┃ ──「 🎞️ Source Selection 」──
┃
┃ ➊  Sinhalasub
┃ ➋  Cinesubz
┃ ➌  Dinka Sinhalasub
┃ ➍  SL Anime Club
┃ ➎  Pirate.lk
┃ ➏  Moviesublk
┃ ➐  Lakvision
┃ ➑  CineTV
┃ ➒  Cine Group
┃
┃ ─────────────────⬣
┃ 💬 Reply with number (1-9)
┃ ⏰ Menu expires in *20 minutes*
┃
╰━━━〔 🌏 SHAVIYA-XMD V4 MOVIE LK 〕━━━⬣
  ⚡ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`;

        const listMsg = await conn.sendMessage(from, {
            image: { url: posterUrl },
            caption: menu
        }, { quoted: m });

        const sourceMap = {
            '1': 'sinhalasub',
            '2': 'cinesubz',
            '3': 'dinka',
            '4': 'anime',
            '5': 'pirate',
            '6': 'moviesub',
            '7': 'lakvision',
            '8': 'cinetv',
            '9': 'cinegroup'
        };

        const startFlow = async () => {
            while (true) {
                const selection = await waitForReply(conn, from, sender, listMsg.key.id, MOVIE_TIMEOUT);
                if (!selection) {
                    await conn.sendMessage(from, { text: "⏰ *Movie menu expired (20 min timeout)*" });
                    break;
                }

                const selText = selection.text;
                if (!/^[1-9]$/.test(selText)) {
                    await conn.sendMessage(from, { text: "❌ *1-9 අතරෙ අංකයක් reply කරන්න!*" });
                    continue;
                }

                const targetPattern = sourceMap[selText];
                await conn.sendMessage(from, { react: { text: "🔍", key: selection.msg.key } });

                const selectedCmd = commands.find(c => c.pattern === targetPattern);
                if (selectedCmd) {
                    try {
                        await selectedCmd.function(conn, selection.msg, selection.msg, {
                            from, q, reply,
                            isGroup: m.isGroup,
                            sender: m.sender,
                            pushname: m.pushname
                        });
                    } catch (err) {
                        await conn.sendMessage(from, { text: `❌ ${targetPattern} error: ${err.message}` });
                    }
                } else {
                    await conn.sendMessage(from, { text: `❌ *${targetPattern} plugin not found!*` });
                }
            }
        };

        startFlow();

    } catch (e) {
        console.error("Movie Engine Error:", e);
        reply(`❌ Movie error: ${e.message}`);
    }
});
