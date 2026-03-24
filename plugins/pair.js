const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "pair",
    alias: ["getpair", "clonebot"],
    react: "👾",
    desc: "Get pairing code for SHAVIYA-XMD V4 bot",
    category: "download",
    use: ".pair 9477xxxxxx",
    filename: __filename
}, async (conn, mek, m, { q, senderNumber, reply }) => {
    try {
        // If no number provided
        if (!q) {
            return await reply(
                "⛔ *Phone number not found!*\n\n" +
                "📌 *Example:*\n" +
                ".pair 9477xxxxxx\n" +
                ".pair +9477xxxxxx"
            );
        }

        const phoneNumber = q.trim();

        // Validate number
        if (!phoneNumber.match(/^\+?\d{10,15}$/)) {
            return await reply(
                "❌ *Invalid phone number format!*\n\n" +
                "📌 *Example:*\n" +
                ".pair 9477xxxxxx\n" +
                ".pair +9477xxxxxx"
            );
        }

        // Remove + and non-numbers
        const cleanNumber = phoneNumber.replace(/\D/g, "");

        // Call API
        const res = await axios.get(
            `https://shaviya-xmd-pair.onrender.com/code?number=${cleanNumber}`
        );

        const code = res.data?.code;

        if (!code) {
            return await reply("❌ Could not retrieve pairing code.");
        }

        await reply(
            "> *SHAVIYA-XMD V4 PAIRING COMPLETED ☑️*\n\n" +
            `*👾 Your pairing code is:* ${code}`
        );

        await new Promise(resolve => setTimeout(resolve, 2000));
        await reply(`${code}`);

    } catch (err) {
        console.error("error:", err);
        await reply("❌ Error getting pairing code.");
    }
});
