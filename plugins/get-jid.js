const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "jid",
    alias: ["id", "chatid", "gjid"],  
    desc: "Get full JID from number, group, channel, or current chat (Creator Only)",
    react: "🆔",
    category: "utility",
    filename: __filename,
}, async (conn, mek, m, { from, isGroup, reply, sender }) => {
    try {
        let input = m.text.split(" ")[1]; // User input after command
        let chatJID;

        if (!input) {
            // No input → return current chat JID
            if (isGroup) {
                chatJID = from; // group
            } else if (from.endsWith('@newsletter')) {
                chatJID = from; // channel
            } else {
                chatJID = from; // private chat receiver
            }
        } else {
            // Input provided → convert to full JID
            input = input.replace(/\D/g, ""); // remove non-digit characters
            if (input.length < 8) return reply("⚠️ Please provide a valid number.");

            // Detect type: group (if starts with 1203) or private chat
            if (input.startsWith("1203")) {
                chatJID = `${input}@g.us`; // group
            } else {
                chatJID = `${input}@s.whatsapp.net`; // private chat
            }
        }

        return reply(`${chatJID}`);

    } catch (e) {
        console.error("JID Error:", e);
        reply(`⚠️ ${e.message}`);
    }
});
