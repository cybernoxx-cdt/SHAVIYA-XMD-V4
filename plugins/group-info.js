const config = require('../config')
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions')

// Fake vCard
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
    pattern: "ginfo",
    react: "🥏",
    alias: ["groupinfo"],
    desc: "Get group informations.",
    category: "group",
    use: '.ginfo',
    filename: __filename
},
async (conn, mek, m, { from, quoted, isGroup, sender, participants, reply }) => {
    try {

        // Load reply messages safely
        const res = await fetchJson(
            'https://raw.githubusercontent.com/KNIGHT-MD-V1/DARK-KNIGHT-XMD/refs/heads/main/MSG/mreply.json'
        );

        const msr = res?.replyMsg || {};
        msr.only_gp = msr.only_gp || "❗ This command can be used only in groups!";

        // === ONLY CHECK GROUP ===
        if (!isGroup) return reply(msr.only_gp);

        // === GROUP ICON FALLBACK ===
        const ppUrls = [
            'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
            'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
            'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
        ];

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(from, 'image');
        } catch {
            ppUrl = ppUrls[Math.floor(Math.random() * ppUrls.length)];
        }

        // === GROUP METADATA ===
        const metadata = await conn.groupMetadata(from);
        const groupAdmins = participants.filter(p => p.admin);

        const listAdmin = groupAdmins.length
            ? groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n')
            : "No admins found";

        const owner = metadata.owner
            ? `@${metadata.owner.split('@')[0]}`
            : "Not available";

        const gdata = `*「 Group Information 」*\n
🔥 \`Group Name:\` ${metadata.subject}
🎀 \`Group ID:\` ${metadata.id}
👥 \`Participant Count:\` ${metadata.size}
👾 \`Group Creator:\` ${owner}
📃 \`Group Description:\` ${metadata.desc?.toString() || 'No description'}\n
🥷 \`Group Admins:\`\n${listAdmin}\n
> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption: gdata,
            mentions: participants.map(v => v.id)
        }, { quoted: fakevCard });

    } catch (e) {
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        console.log(e);
        reply(`❌ *Error Occurred !!*\n\n${e.message}`);
    }
});
