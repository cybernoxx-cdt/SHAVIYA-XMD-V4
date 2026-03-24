const { cmd } = require('../command');
const { getBuffer } = require('../lib/functions');

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
  pattern: "gid",
  alias: ["groupid", "grouplinkinfo"],
  react: "🪀",
  desc: "Get Group info from invite link with profile picture",
  category: "whatsapp",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {

  try {

    if (!q) {
      return reply("*Please provide a WhatsApp Channel link.*\n\n*Example:* .gid https://chat.whatsapp.com/xxxx");
    }

    // Extract invite code
    const match = q.match(/chat\.whatsapp\.com\/([\w-]+)/);

    if (!match) {
      return reply("⚠️ *Invalid group link format.*\n\nMake sure it looks like:\nhttps://chat.whatsapp.com/xxxxxxxx");
    }

    const inviteCode = match[1];

    // Fetch group invite metadata
    let metadata;
    try {
      metadata = await conn.groupGetInviteInfo(inviteCode);
    } catch {
      return reply("*❌ Failed to fetch group info. The link may be invalid or expired.*");
    }

    if (!metadata?.id) {
      return reply("❌ Group not found or inaccessible.");
    }

    const infoText = `*— 乂 Group Link Info —*\n\n` +
      `🔥 \`Group Name:\` ${metadata.subject}\n` +
      `🆔 \`Group ID:\` ${metadata.id}\n` +
      `👥 \`Participant Count:\` ${metadata.size || "Unknown"}\n` +
      `👑 \`Group Creator:\` ${metadata.owner || "Unknown"}\n` +
      `📃 \`Group Description:\` ${metadata.desc || "No description"}\n` +
      `📅 \`Group Created:\` ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleString() : "Unknown"}\n\n` +
      `> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

    // === Get Group Profile Picture using Buffer ===
    let groupPP;

    try {
      const ppUrl = await conn.profilePictureUrl(metadata.id, "image");
      groupPP = await getBuffer(ppUrl);
    } catch {
      groupPP = await getBuffer("https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png");
    }

    await conn.sendMessage(from, {
      image: groupPP,
      caption: infoText
    }, { quoted: fakevCard });

  } catch (error) {
    console.error("❌ Error in gid plugin:", error);
    reply("*Error fetching group link info*");
  }

});
