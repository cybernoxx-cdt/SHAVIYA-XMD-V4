const config = require('../config');
const {cmd , commands} = require('../command');
const axios = require ("axios");

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
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
    pattern: "lyrics",
    desc: "Get song lyrics",
    category: "tools",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {
        if (!q) {
            return reply(
                "Please provide a song title.\n\nExample: .lirik Lelena"
            );
        }

        const apiUrl = `https://apis.sandarux.sbs/api/search/lyrics?apikey=darknero&title=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.title || !data.lyrics) {
            await react("❌");
            return reply("Lyrics not found.");
        }

        let text = `🔍 *Lyrics Track Found* 🎵\n\n`;
        text += `*📝 Name / TrackName:* ${data.title}\n`;
        text += `*🕵️ ArtistName:* ${data.artist}\n`;
        text += `*💽 AlbumName:* ${data.album}\n`;
        text += `*📃 PlainLyrics:*\n ${data.lyrics}\n\n`;
        text += `*📊 SyncedLyrics:*\n ${data.syncedLyrics}\n\n`;
        text += `> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;
       
            await conn.sendMessage(
            from,
            { text: text },
            { quoted: fakevCard }
        );

        await react("✅");

    } catch (e) {
        console.error("Lirik Error:", e);
        await react("❌");
        reply("An error occurred while fetching lyrics.");
    }
});
