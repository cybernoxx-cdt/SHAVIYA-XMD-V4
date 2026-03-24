const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');
const os = require("os");

const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA TECH",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "alive",
    alias: ["hyranu", "ranu", "status", "a"],
    react: "🌝",
    desc: "Check bot online or no.",
    category: "main",
    filename: __filename
},
async (robin, mek, m, {
    from, pushname, quoted, reply, sender
}) => {
    try {
        await robin.sendPresenceUpdate('recording', from);

        // Get Sri Lankan Date & Time
        const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', hour12: true });
        const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
        const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' });

        // Stylish Alive Caption
        const status = `👋 𝐇𝐞𝐥𝐥𝐨 ${pushname}, 𝐈 𝐚𝐦 𝐚𝐥𝐢𝐯𝐞 𝐧𝐨𝐰 !!

*╭─〔 DATE & TIME INFO 〕─◉*
*│*📅 *\`Date:\`* ${date}
*│*⏰ *\`Time:\`* ${time}
*╰────────────⊷*

*╭─〔 ALIVE STATUS INFO 〕─◉*
*│*
*│*🐼 *\`Bot\`*: 𝐒𝐇𝐀𝐕𝐈𝐘𝐀-𝐗𝐌𝐃-𝐕𝟰
*│*🤵‍♂ *\`Owner\`*: SHAVIYA TECH
*│*👤 *\`User\`*: ${pushname}
*│*📟 *\`Uptime\`*: ${runtime(process.uptime())}
*│*⏳ *\`Ram\`*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB
*│*🖊 *\`Prefix\`*: [ ${config.PREFIX} ]
*│*🛠 *\`Mode\`*: [ ${config.MODE} ]
*│*🖥 *\`Host\`*: ${os.hostname()}
*│*🌀 *\`Version\`*: ${config.BOT_VERSION}
*╰────────────────⊷*
     
      ☘ ʙᴏᴛ ᴍᴇɴᴜ  - .menu
      🔥 ʙᴏᴛ ꜱᴘᴇᴇᴅ - .ping

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

        // Send Image + Caption first
        await robin.sendMessage(from, {
            image: {
                url: "https://i.ibb.co/C5PdQgTz/imgbb-1774247334984.jpg"
            },
            caption: status,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: false
            }
        }, { quoted: mek });

        // Try sending voice note — skip if URL fails
        try {
            const audioUrls = [
                "https://files.catbox.moe/s1pn69.opus",
                "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            ];
            for (const url of audioUrls) {
                try {
                    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
                    if (res.status === 200) {
                        await robin.sendMessage(from, {
                            audio: Buffer.from(res.data),
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: true
                        }, { quoted: fakevCard });
                        break;
                    }
                } catch {}
            }
        } catch {}

    } catch (e) {
        console.log("Alive Error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});
