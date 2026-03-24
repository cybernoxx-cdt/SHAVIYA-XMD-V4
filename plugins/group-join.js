const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

cmd({
    pattern: "join",
    alias: ["joingroup"],
    react: "📩",
    desc: "Join a WhatsApp group using an invite link (Owner only)",
    category: "owner",
    use: ".join <group link>",
    isOwner: true, // ✅ Only Owner can use this
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isOwner }) => {
    try {
        // 🔒 Extra Safety Check
        if (!isOwner) return reply("🚫 *Owner Only Command!*");

        if (!q) return reply("❌ Please send a valid WhatsApp group link!\nExample: .join https://chat.whatsapp.com/xxxxxx");

        // 🔍 Check valid link
        const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/;
        const match = q.match(linkRegex);
        if (!match) return reply("⚠️ Invalid WhatsApp group link!");

        const inviteCode = match[1];

        // ⏳ React while joining
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // 🚀 Try joining
        let res = await conn.groupAcceptInvite(inviteCode);
        await sleep(1000);

        // ✅ Success
        if (res) {
            await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return reply("✅ Successfully joined the group!");
        } else {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ Failed to join the group. Unknown error occurred!");
        }

    } catch (e) {
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        console.error(e);

        const errMsg = String(e);

        if (errMsg.includes("already")) {
            return reply("😊 You are already joined in the group!");
        } else if (errMsg.includes("not-authorized")) {
            return reply("🚫 Failed: Bot is not authorized to join this group!");
        } else if (errMsg.includes("invalid") || errMsg.includes("400")) {
            return reply("⚠️ Invalid group invite link!");
        } else {
            return reply("❌ Error joining group:\n" + e.message);
        }
    }
});
