const config = require('../config');
const { cmd } = require('../command');
const os = require('os');

// WhatsApp Secret Code vCard style
const secretvCard = {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA-XMD V4",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "ping",
    alias: ["speed", "pong", "shaviyaspeed", "test"],
    desc: "Check bot response speed",
    category: "main",
    react: "🚀",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        const startTime = Date.now();

        await conn.sendMessage(from, { react: { text: '🚀', key: mek.key } });

        const ping = Date.now() - startTime;

        let badge, color;
        if (ping <= 100)       { badge = '🚀 ULTRA FAST'; color = '🟢'; }
        else if (ping <= 250)  { badge = '⚡ SUPER FAST'; color = '🟢'; }
        else if (ping <= 500)  { badge = '✅ FAST';       color = '🟡'; }
        else if (ping <= 1000) { badge = '⚠️ MEDIUM';     color = '🟠'; }
        else                   { badge = '🐢 SLOW';       color = '🔴'; }

        const ramUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(2);

        const text = `╭━━━〔 🚀 *SHAVIYA-XMD V4 PING* 〕━━━⬣
┃
┃ ⚡ *Ping*    : ${ping} ms
┃ ${color} *Speed*   : ${badge}
┃ 🧠 *RAM*     : ${ramUsed}MB / ${ramTotal}MB
┃ 🌀 *Version* : ${config.BOT_VERSION}
┃ 🌐 *Host*    : ${os.hostname()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: 'shavi&newsletter',
                    newsletterName: 'SHAVIYA-XMD V4',
                    serverMessageId: 143
                }
            }
        }, { quoted: secretvCard });

    } catch (e) {
        console.error("Ping error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
