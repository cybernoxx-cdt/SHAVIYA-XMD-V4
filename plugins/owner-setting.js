const { cmd, commands } = require('../command');
const { exec } = require('child_process');
const config = require('../config');
const { sleep } = require('../lib/functions');
const { setSetting, getSetting } = require('../lib/settings');

const secretvCard = {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA-XMD V4",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// 1. Shutdown
cmd({ pattern: "shutdown", desc: "Shutdown the bot.", category: "owner", react: "🛑", filename: __filename },
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    await reply("🛑 Shutting down..."); process.exit(0);
});

// 2. Restart
cmd({ pattern: "restart", desc: "Restart the bot.", category: "owner", react: "🔄", filename: __filename },
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    await reply(
        `╭━━━〔 *🔄 RESTARTING* 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🤖 *Bot:* SHAVIYA-XMD V4\n` +
        `┃ ⚡ *Status:* Restarting...\n` +
        `┃ ⏱️ *ETA:* ~15 seconds\n` +
        `┃\n` +
        `┃ ℹ️ Active menus will reset.\n` +
        `┃ Please re-run commands after.\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━⬣\n` +
        `> © 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎`
    );
    setTimeout(() => process.exit(0), 3000);
});

// 3. Broadcast
cmd({ pattern: "broadcast", desc: "Broadcast to all groups.", category: "owner", react: "📢", filename: __filename },
async (conn, mek, m, { from, isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    if (!args.length) return reply("📢 Provide a message.");
    const message = args.join(' ');
    const groups = Object.keys(await conn.groupFetchAllParticipating());
    for (const gid of groups) {
        await conn.sendMessage(gid, { text: message }, { quoted: mek });
        await sleep(500);
    }
    reply(`📢 Broadcasted to ${groups.length} groups.`);
});

// 4. Set Profile Picture
cmd({ pattern: "setpp", desc: "Set bot profile picture.", category: "owner", react: "🖼️", filename: __filename },
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    if (!m.quoted?.message?.imageMessage) return reply("❌ Reply to an image.");
    try {
        const media = await conn.downloadMediaMessage(m.quoted);
        await conn.updateProfilePicture(conn.user.jid, { url: media });
        reply("🖼️ Profile picture updated!");
    } catch (e) { reply(`❌ Error: ${e.message}`); }
});

// 5. Group JIDs
cmd({ pattern: "gjid", desc: "Get all group JIDs.", category: "owner", react: "📝", filename: __filename },
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const groups = await conn.groupFetchAllParticipating();
    const list = Object.entries(groups).map(([jid, g]) => `• ${g.subject || 'Unknown'}: ${jid}`).join('\n');
    reply(`📝 *Group JIDs:*\n\n${list || 'No groups found.'}`);
});

// 6. Delete message
cmd({ pattern: "delete", alias: ["del", "delx"], react: "❌", desc: "Delete quoted message", category: "group", filename: __filename },
async (conn, mek, m, { from, isOwner, isAdmins, reply }) => {
    try {
        if (m.isGroup && !(isOwner || isAdmins)) return reply("❌ Owner or Admin only!");
        if (!m.quoted) return reply("❌ Reply to a message to delete!");
        await conn.sendMessage(m.chat, { delete: {
            remoteJid: m.chat, id: m.quoted.id,
            fromMe: m.quoted.fromMe, participant: m.quoted.sender
        }});
    } catch(e) { reply('✅ Deleted successfully!'); }
});

// 7. Bot mode
cmd({ pattern: "mode", desc: "Change bot mode.", category: "owner", react: "⚙️", filename: __filename },
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const modes = ['public', 'private', 'inbox', 'groups', 'premium'];
    if (!args[0] || !modes.includes(args[0])) return reply(`⚙️ Valid modes: ${modes.join(', ')}`);
    setSetting('mode', args[0]);
    reply(`✅ Mode set to *${args[0]}*`);
});

// 8. Set prefix
cmd({ pattern: "setprefix", desc: "Change bot prefix.", category: "owner", react: "🔧", filename: __filename },
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    if (!args[0]) return reply("🔧 Provide a prefix. Example: .setprefix !");
    setSetting('prefix', args[0]);
    reply(`✅ Prefix changed to *${args[0]}*`);
});

// 9. Antidelete toggle
cmd({ pattern: "antidelete", desc: "Toggle antidelete on/off.", category: "owner", react: "🗑️", filename: __filename },
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const val = args[0]?.toLowerCase();
    if (!['on','off'].includes(val)) return reply("Usage: .antidelete on/off");
    setSetting('antidelete', val === 'on');
    reply(`✅ Antidelete: *${val.toUpperCase()}*`);
});

// 10. Antilink toggle
cmd({ pattern: "antilink", desc: "Toggle antilink on/off.", category: "owner", react: "🔗", filename: __filename },
async (conn, mek, m, { isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const val = args[0]?.toLowerCase();
    if (!['on','off'].includes(val)) return reply("Usage: .antilink on/off");
    setSetting('antiLink', val === 'on');
    reply(`✅ Antilink: *${val.toUpperCase()}*`);
});

// 11. Block/Unblock
cmd({ pattern: "block", desc: "Block a user.", category: "owner", react: "🚫", filename: __filename },
async (conn, mek, m, { isOwner, reply, mentioned }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const jid = m.quoted?.sender || mentioned?.[0];
    if (!jid) return reply("❌ Tag or reply to a user.");
    await conn.updateBlockStatus(jid, "block");
    reply(`🚫 Blocked: @${jid.split('@')[0]}`);
});

cmd({ pattern: "unblock", desc: "Unblock a user.", category: "owner", react: "✅", filename: __filename },
async (conn, mek, m, { isOwner, reply, mentioned }) => {
    if (!isOwner) return reply("❌ Owner only!");
    const jid = m.quoted?.sender || mentioned?.[0];
    if (!jid) return reply("❌ Tag or reply to a user.");
    await conn.updateBlockStatus(jid, "unblock");
    reply(`✅ Unblocked: @${jid.split('@')[0]}`);
});
