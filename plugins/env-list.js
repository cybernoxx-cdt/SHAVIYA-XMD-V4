const { cmd, commands } = require('../command');
const config = require('../config');
const fs = require('fs');
const { getAnti, setAnti } = require('../data/antidel');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, sleep, fetchJson } = require('../lib/functions2');

// image & audio
const image = "https://i.ibb.co/C5PdQgTz/imgbb-1774247334984.jpg";
const audioUrl = "https://github.com/Ranumithaofc/RANU-FILE-S-/raw/refs/heads/main/Audio/env%20new%20typ.opus";

function isEnabled(value) {
    return value === "true" || value === true;
}

const RUNTIME_CONFIG_FILE = require('path').join(__dirname, '../data/runtime-config.json');

function saveConfig() {
    // Safe: save to runtime-config.json, NOT to config.js
    try {
        const runtimeData = {};
        const keys = ['PREFIX','MODE','AUTO_VOICE','AUTO_AI','ANTILINK','ALWAYS_ONLINE',
            'AUTO_READ_STATUS','AUTO_READ_CMD','ALWAYS_TYPING','ALWAYS_RECORDING',
            'ANTI_BOT','ANTI_DELETE','ANTI_BAD_WORDS_ENABLED','PACKNAME','AUTHOR'];
        keys.forEach(k => { if (process.env[k] !== undefined) runtimeData[k] = process.env[k]; });
        require('fs').writeFileSync(RUNTIME_CONFIG_FILE, JSON.stringify(runtimeData, null, 2));
    } catch(e) { console.error('[saveConfig] Error:', e.message); }
}

const fakevCard = {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA TECH",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:SHAVIYA-XMD V4
ORG:SHAVIYA TECH;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};

cmd({
    pattern: "settings",
    alias: ["env", "config", "setting"],
    desc: "Interactive bot settings menu (Owner Only)",
    category: "system",
    filename: __filename
}, async (conn, mek, m, { from, isOwner, reply }) => {
    try {
        if (!isOwner) return reply("🚫 *Owner Only Command!*");

        const info = `╭─『 ⚙️ 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 𝗠𝗘𝗡𝗨 ⚙️ 』───❏
│
├─❏ *🔖 BOT INFO*
├─∘ *Name:* SHAVIYA-XMD V4
├─∘ *Prefix:* ${config.PREFIX}
├─∘ *Owner:* SHAVIYA TECH
├─∘ *Number:* ${config.OWNER_NUMBER}
└─∘ *Version:* ${config.BOT_VERSION}
    
      ╭─ 🛡️ 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 🛡️ ─╮
╭───────────────────╮
│ SELECT WORK MODE *${config.MODE.toUpperCase()}*  |
╰───────────────────╯ 
│ ┣ 1.1  Public  
│ ┣ 1.2  Private 
│ ┣ 1.3  Group   
│ ┗ 1.4  Inbox
│
╭──────────────────╮
│ Auto Recording: ${isEnabled(config.AUTO_RECORDING) ? "✅" : "❌"}                 |
╰──────────────────╯ 
│ ┣ 2.1  true  ✅ 
│ ┗ 2.2  false ❌
│
╭──────────────────╮
│ Auto Typing: ${isEnabled(config.AUTO_TYPING) ? "✅" : "❌"}                        |
╰──────────────────╯ 
│ ┣ 3.1  true  ✅ 
│ ┗ 3.2  false ❌
│
╭──────────────────╮
│ Always Online: ${isEnabled(config.ALWAYS_ONLINE) ? "✅" : "❌"}                    |
╰──────────────────╯ 
│ ┣ 4.1  true  ✅ 
│ ┗ 4.2  false ❌
│
╭──────────────────╮
│ Public Mod: ${isEnabled(config.PUBLIC_MODE) ? "✅" : "❌"}                         |
╰──────────────────╯ 
│ ┣ 5.1  true  ✅ 
│ ┗ 5.2  false ❌
│
╭──────────────────╮
│ Auto Voice: ${isEnabled(config.AUTO_VOICE) ? "✅" : "❌"}                          |
╰──────────────────╯ 
│ ┣ 6.1  true  ✅ 
│ ┗ 6.2  false ❌
│
╭──────────────────╮
│ Auto Sticker: ${isEnabled(config.AUTO_STICKER) ? "✅" : "❌"}                       |
╰──────────────────╯ 
│ ┣ 7.1  true  ✅ 
│ ┗ 7.2  false ❌
│
╭──────────────────╮
│ Auto Reply: ${isEnabled(config.AUTO_REPLY) ? "✅" : "❌"}                          |
╰──────────────────╯ 
│ ┣ 8.1  true  ✅ 
│ ┗ 8.2  false ❌
│
╭──────────────────╮
│ Auto React: ${isEnabled(config.AUTO_REACT) ? "✅" : "❌"}                         |
╰──────────────────╯ 
│ ┣ 9.1  true  ✅ 
│ ┗ 9.2  false ❌
│
╭──────────────────╮
│ Auto Status Seen: ${isEnabled(config.AUTO_STATUS_SEEN) ? "✅" : "❌"}              |
╰──────────────────╯ 
│ ┣ 10.1  true  ✅ 
│ ┗ 10.2  false ❌
│
╭──────────────────╮
│ Auto Status Reply: ${isEnabled(config.AUTO_STATUS_REPLY) ? "✅" : "❌"}             |
╰──────────────────╯ 
│ ┣ 11.1  true  ✅ 
│ ┗ 11.2  false ❌
│
╭──────────────────╮
│ Auto Status React: ${isEnabled(config.AUTO_STATUS_REACT) ? "✅" : "❌"}             |
╰──────────────────╯ 
│ ┣ 12.1  true  ✅ 
│ ┗ 12.2 false ❌
│
╭──────────────────╮
│ Custom React: ${isEnabled(config.CUSTOM_REACT) ? "✅" : "❌"}                   |
╰──────────────────╯ 
│ ┣ 13.1  true  ✅ 
│ ┗ 13.2  false ❌
│
╭──────────────────╮
│ Anti Delete: ${isEnabled(config.ANTI_DELETE) ? "✅" : "❌"}                          |
╰──────────────────╯ 
│ ┣ 14.1  true  ✅ 
│ ┗ 14.2  false ❌
│
╭──────────────────╮
│ Anti VV: ${isEnabled(config.ANTI_VV) ? "✅" : "❌"}                                |
╰──────────────────╯ 
│ ┣ 15.1  true  ✅ 
│ ┗ 15.2  false ❌
│
╭──────────────────╮
│ Welcome: ${isEnabled(config.WELCOME) ? "✅" : "❌"}                            |
╰──────────────────╯ 
│ ┣ 16.1  true  ✅ 
│ ┗ 16.2  false ❌
│
╭──────────────────╮
│ Anti Link: ${isEnabled(config.ANTI_LINK) ? "✅" : "❌"}                              |
╰──────────────────╯ 
│ ┣ 17.1  true  ✅ 
│ ┗ 17.2  false ❌
│
╭──────────────────╮
│ Read Message: ${isEnabled(config.READ_MESSAGE) ? "✅" : "❌"}                  |
╰──────────────────╯ 
│ ┣ 18.1  true  ✅ 
│ ┗ 18.2  false ❌
│
╭──────────────────╮
│ Anti Bad: ${isEnabled(config.ANTI_BAD) ? "✅" : "❌"}                              |
╰──────────────────╯ 
│ ┣ 19.1  true  ✅ 
│ ┗ 19.2  false ❌
│
╭──────────────────╮
│ Anti Link Kick: ${isEnabled(config.ANTI_LINK_KICK) ? "✅" : "❌"}                     |
╰──────────────────╯ 
│ ┣ 20.1  true  ✅ 
│ ┗ 20.2  false ❌
│
╭──────────────────╮
│ Read CMD: ${isEnabled(config.READ_CMD) ? "✅" : "❌"}                          |
╰──────────────────╯ 
│ ┣ 21.1  true  ✅ 
│ ┗ 21.2  false ❌
│
│
├─❏ *🦠 STATUS*
│  ├─∘ Auto Status MSG: ${config.AUTO_STATUS_MSG}
│  ├─∘ Custom React Emojis: ${config.CUSTOM_REACT_EMOJIS}
│  ├─∘ Anti-Del Path: ${config.ANTI_DEL_PATH}
│  └─∘ Dev Number: ${config.DEV}
│
╰──────────────────❏

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

        const sentMsg = await conn.sendMessage(from, { image: { url: image }, caption: info }, { quoted: fakevCard });
        await conn.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: mek });

        const menuId = sentMsg.key.id;

        conn.ev.on('messages.upsert', async (msgUpdate) => {
            const mekInfo = msgUpdate?.messages[0];
            if (!mekInfo?.message) return;
            const fromUser = mekInfo.key.remoteJid;
            const textMsg = mekInfo.message.conversation || mekInfo.message.extendedTextMessage?.text;
            const quotedId = mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId;
            if (quotedId !== menuId) return;
            if (!isOwner) return conn.sendMessage(fromUser, { text: "🚫 *Owner Only!*" }, { quoted: mekInfo });

            const userInput = textMsg?.trim();

            const modeMap = {
                "1.1": "public",
                "1.2": "private",
                "1.3": "group",
                "1.4": "inbox"
            };

            if (modeMap[userInput]) {
                const newMode = modeMap[userInput];
                if (config.MODE === newMode) {
                    return conn.sendMessage(fromUser, { text: `⚠️ Bot mode already ${newMode.toUpperCase()}` }, { quoted: mekInfo });
                }
                config.MODE = newMode;
                saveConfig();
                await conn.sendMessage(fromUser, { react: { text: "✅", key: mekInfo.key } });
                return conn.sendMessage(fromUser, { text: `✔️ Bot mode set to ${newMode.toUpperCase()}` }, { quoted: mekInfo });
            }

            const map = {
                "2.1": ["AUTO_RECORDING", true], "2.2": ["AUTO_RECORDING", false],
                "3.1": ["AUTO_TYPING", true], "3.2": ["AUTO_TYPING", false],
                "4.1": ["ALWAYS_ONLINE", true], "4.2": ["ALWAYS_ONLINE", false],
                "5.1": ["PUBLIC_MODE", true], "5.2": ["PUBLIC_MODE", false],
                "6.1": ["AUTO_VOICE", true], "6.2": ["AUTO_VOICE", false],
                "7.1": ["AUTO_STICKER", true], "7.2": ["AUTO_STICKER", false],
                "8.1": ["AUTO_REPLY", true], "8.2": ["AUTO_REPLY", false],
                "9.1": ["AUTO_REACT", true], "9.2": ["AUTO_REACT", false],
                "10.1": ["AUTO_STATUS_SEEN", true], "10.2": ["AUTO_STATUS_SEEN", false],
                "11.1": ["AUTO_STATUS_REPLY", true], "11.2": ["AUTO_STATUS_REPLY", false],
                "12.1": ["AUTO_STATUS_REACT", true], "12.2": ["AUTO_STATUS_REACT", false],
                "13.1": ["CUSTOM_REACT", true], "13.2": ["CUSTOM_REACT", false],
                "15.1": ["ANTI_VV", true], "15.2": ["ANTI_VV", false],
                "16.1": ["WELCOME", true], "16.2": ["WELCOME", false],
                "17.1": ["ANTI_LINK", true], "17.2": ["ANTI_LINK", false],
                "18.1": ["READ_MESSAGE", true], "18.2": ["READ_MESSAGE", false],
                "19.1": ["ANTI_BAD", true], "19.2": ["ANTI_BAD", false],
                "20.1": ["ANTI_LINK_KICK", true], "20.2": ["ANTI_LINK_KICK", false],
                "21.1": ["READ_CMD", true], "21.2": ["READ_CMD", false],
            };

            // Anti-delete
            if (userInput === "14.1") {
                await setAnti(true);
                config.ANTI_DELETE = "true";
                saveConfig();
                await conn.sendMessage(fromUser, { react: { text: "✅", key: mekInfo.key } });
                return conn.sendMessage(fromUser, { text: "✅ Anti-delete has been enabled" }, { quoted: mekInfo });
            }
            if (userInput === "14.2") {
                await setAnti(false);
                config.ANTI_DELETE = "false";
                saveConfig();
                await conn.sendMessage(fromUser, { react: { text: "❌", key: mekInfo.key } });
                return conn.sendMessage(fromUser, { text: "❌ Anti-delete has been disabled" }, { quoted: mekInfo });
            }

            // General toggle + react
            if (map[userInput]) {
                const [key, toggle] = map[userInput];
                const current = isEnabled(config[key]);
                if (current === toggle) {
                    return conn.sendMessage(fromUser, { text: `⚠️ ${key.replace(/_/g, " ")} already ${toggle ? "ON" : "OFF"}` }, { quoted: mekInfo });
                }
                config[key] = toggle ? "true" : "false";
                saveConfig();
                await conn.sendMessage(fromUser, { react: { text: toggle ? "✅" : "❌", key: mekInfo.key } });
                return conn.sendMessage(fromUser, { text: `${toggle ? "✅" : "❌"} ${key.replace(/_/g, " ")} now ${toggle ? "ON" : "OFF"}` }, { quoted: mekInfo });
            }

            return conn.sendMessage(fromUser, { text: "❌ Invalid option!" }, { quoted: mekInfo });
        });

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message || "Something went wrong!"}`);
    }
});
