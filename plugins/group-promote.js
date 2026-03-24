const { cmd } = require('../command');

cmd({
    pattern: "p",
    alias: ["promote", "admin", "makeadmin"],
    desc: "Promote a user to admin (reply or mention)",
    category: "admin",
    react: "⬆️",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, isOwner, isBotAdmins, isAdmins, participants, reply }) => {
    try {
        // Only in groups
        if (!isGroup) return reply("📛 *Group command only!*");
        if (!isOwner) return reply("📛 *Owner only command!*");

        // Get user to promote (from mention or reply)
        let quoted = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] 
                   || mek.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quoted) return reply("⚠️ *Reply to a user's message or tag them to promote!*"); 

        // Bot cannot promote itself
        const botJid = conn.user.id.split(":")[0] + "@s.whatsapp.net";
        if (quoted === botJid) return reply("😒 *It's me!*");

        // ✅ Check if user is already admin
        const groupAdmins = participants.filter(p => p.admin).map(p => p.id);
        if (groupAdmins.includes(quoted)) {
            return reply("✅ That user is already an admin!");
        }

        // Promote user
        await conn.groupParticipantsUpdate(from, [quoted], "promote");

        // Success message
        await conn.sendMessage(from, { 
            text: `✅ *Successfully Promoted:* @${quoted.split("@")[0]}`,
            mentions: [quoted]
        });

    } catch (err) {
        console.log(err);
        reply("❌ *Failed to promote user!*");
    }
});
