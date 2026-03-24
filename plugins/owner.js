const { cmd } = require('../command');
const config = require('../config');

// WhatsApp Secret Code Style vCard (hidden Meta AI style)
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
        const ownerNumber = config.OWNER_NUMBER;
        const ownerName   = config.OWNER_NAME || "Savendra";

        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${ownerName}\n` +
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:+${ownerNumber.replace('+','')}\n` +
                      'END:VCARD';

        // Send vCard contact
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

        // Send owner info image
        await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/s1pn69.jpg' },
            caption: `╭━━━〔 *🤵‍♂ OWNER INFO* 〕━━━⬣
┃
┃ 👤 *Name* : ${ownerName}
┃ 📱 *Number* : +${ownerNumber.replace('+','')}
┃ 🤖 *Bot* : ${config.BOT_NAME}
┃ 🌀 *Version* : ${config.BOT_VERSION}
┃
╰━━━━━━━━━━━━━━━━━━━━━⬣
> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎`,
            contextInfo: {
                mentionedJid: [`${ownerNumber.replace('+', '')}@s.whatsapp.net`],
                forwardingScore: 999,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: 'shavi&newsletter',
                    newsletterName: 'SHAVIYA-XMD V4',
                    serverMessageId: 143
                }
            }
        }, { quoted: secretvCard });

    } catch (error) {
        console.error("Owner cmd error:", error);
    }
});
