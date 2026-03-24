const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

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
FN:SHAVIYA-XMD V4 AI
ORG:SHAVIYA TECH;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};

// Supported direct video extensions
const videoExts = [
    ".mp4", ".mkv", ".mov", ".webm", ".avi", ".flv",
    ".ts", ".m4v", ".3gp", ".mpeg", ".mpg"
];

// Check if URL is a real direct video
function isDirectVideo(url) {
    const clean = url.split("?")[0].toLowerCase();
    return videoExts.some(ext => clean.endsWith(ext));
}

cmd({
    pattern: "getvideo",
    alias: ["gvideo"],
    desc: "Download ANY direct video link (global support)",
    category: "download",
    react: "🎥",
    use: ".getvideo <video-url>",
    filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {

    try {
        if (!q) return reply("🖇️ *Give me a direct video URL!*");

        let url = q.trim();

        // ❗ Check if the URL is direct video
        if (!isDirectVideo(url)) {
            return reply(
                "❗ *This is NOT a direct video URL!*\n\n" +
                "👉 Please give me a *direct video link* ending with:\n" +
                "`.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.ts` ..."
            );
        }

        // React: Downloading
        await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

        // Fetch the video
        const res = await fetch(url);
        if (!res.ok) throw new Error("Invalid video link");

        const buffer = Buffer.from(await res.arrayBuffer());

        // Save temporarily
        const fileName = Date.now() + path.extname(url.split("?")[0]);
        const filePath = path.join(__dirname, "../temp/" + fileName);

        fs.writeFileSync(filePath, buffer);

        // React: Uploading
        await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

        // Send video
        await conn.sendMessage(from, {
            video: fs.readFileSync(filePath),
            mimetype: "video/mp4",
            caption: "🎥 *Your video is ready!*\n\n> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛"
        }, { quoted: fakevCard });

        // Delete temp file
        fs.unlinkSync(filePath);

        // React finish
        await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    } catch (err) {
        console.log(err);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("❗ *Download failed.* Only DIRECT video URLs are supported.");
    }
});
