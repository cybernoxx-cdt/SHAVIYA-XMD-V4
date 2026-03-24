const { cmd } = require('../command');

cmd({
    pattern: "add",
    desc: "Add a member to the group",
    category: "admin",
    react: "➕",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, isOwner, isAdmins, isBotAdmins, reply, q }) => {
    try {

        if (!isGroup) return reply("📛 *Group command only!*");
        if (!isOwner) return reply("📛 *Owner only command!*");

        if (!q) return reply("🔢 *Please enter a number!*\nExample: `.add 94761234567`");

        // Number formatting
        let number = q.replace(/[^0-9]/g, '');
        if (number.length < 10) return reply("⚠️ *Invalid number!*");

        let userJid = number + "@s.whatsapp.net";

        // Add user
        let res = await conn.groupParticipantsUpdate(from, [userJid], "add");

        // Success message
        await conn.sendMessage(from, { 
            text: `✅ *@${number} user added successfully!*`
        });

    } catch (err) {
        console.log(err);
        reply("❌ *Failed to add the user!*");
    }
});
