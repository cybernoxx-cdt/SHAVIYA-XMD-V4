const { cmd } = require('../command');
const { getBuffer } = require('../lib/functions');

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
  pattern: "gidinfo",
  react: "🛰️",
  desc: "Get full group info using JID",
  category: "whatsapp",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {

  try {

    if (!q) {
      return reply("Provide Group JID.\nExample:\n.gidinfo 120363418546564211@g.us");
    }

    if (!q.endsWith("@g.us")) {
      return reply("Invalid Group JID format.");
    }

    const groupJid = q.trim();

    // 🔥 Get Full Metadata
    const metadata = await conn.groupMetadata(groupJid);

    if (!metadata?.id) return reply("Group not found or bot not in group.");

    // 🔥 Get Invite Link
    let inviteLink = "Not available";
    try {
      const inviteCode = await conn.groupInviteCode(groupJid);
      inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
    } catch {}

    // 🔥 Admin List
    const admins = metadata.participants.filter(p => p.admin);
    const adminList = admins.length
      ? admins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n')
      : "No admins found";

    const owner = metadata.owner
      ? `@${metadata.owner.split('@')[0]}`
      : "Unknown";

    const text = `*「 Full Group Information 」*\n
🔥 \`Group Name:\` ${metadata.subject}
🆔 \`Group ID:\` ${metadata.id}
👥 \`Members:\` ${metadata.size}
👑 \`Owner:\` ${owner}
📃 \`Description:\` ${metadata.desc || "No description"}
📅 \`Created:\` ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleString() : "Unknown"}

🔗 \`Invite Link:\`
${inviteLink}

🥷 \`Admins:\`
${adminList}

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

    // 🔥 Profile Picture
    let pp;
    try {
      const ppUrl = await conn.profilePictureUrl(groupJid, "image");
      pp = await getBuffer(ppUrl);
    } catch {
      pp = await getBuffer("https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png");
    }

    await conn.sendMessage(from, {
      image: pp,
      caption: text,
      mentions: metadata.participants.map(v => v.id)
    }, { quoted: fakevCard });

  } catch (err) {
    console.log(err);
    reply("❌ Failed to fetch group info. Bot must be in that group.");
  }

});
