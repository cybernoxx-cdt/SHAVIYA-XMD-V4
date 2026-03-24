const { cmd } = require('../command');
const config = require('../config');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const secretvCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA-XMD V4",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "owner",
    react: "🤵‍♂️",
    desc: "Get owner contact details",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        const ownerNumber = config.OWNER_NUMBER || "94707085822";
        const ownerName   = config.OWNER_NAME || "Savendra";
        const cleanNumber = ownerNumber.replace('+', '');

        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;

        // 1. Send vCard contact
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

        // 2. Send owner info image
        await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/eqmiio.jpg' },
            caption: `╭━━━〔 *🤵‍♂ OWNER INFO* 〕━━━⬣
┃
┃ 👤 *Name* : ${ownerName}
┃ 📱 *Number* : +${cleanNumber}
┃ 🤖 *Bot* : ${config.BOT_NAME}
┃ 🌀 *Version* : ${config.BOT_VERSION}
┃
╰━━━━━━━━━━━━━━━━━━━━━⬣
> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎`,
            contextInfo: {
                mentionedJid: [`${cleanNumber}@s.whatsapp.net`],
                forwardingScore: 999,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: 'shavi&newsletter',
                    newsletterName: 'SHAVIYA-XMD V4',
                    serverMessageId: 143
                }
            }
        }, { quoted: secretvCard });

        // 3. Send voice note
        const voiceUrl = "https://github.com/Ranumithaofc/RANU-FILE-S-/raw/refs/heads/main/Audio/Ranumitha-x-md-Alive-org.opus";
        try {
            const res = await fetch(voiceUrl);
            if (res.ok) {
                const audioBuffer = Buffer.from(await res.arrayBuffer());
                await conn.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: "audio/ogg; codecs=opus",
                    ptt: true
                }, { quoted: mek });
            }
        } catch (voiceErr) {
            console.log("[OWNER] Voice note failed:", voiceErr.message);
        }

    } catch (error) {
        console.error("Owner cmd error:", error);
    }
});
