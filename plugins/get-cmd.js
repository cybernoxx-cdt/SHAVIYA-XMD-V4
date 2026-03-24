const { cmd, commands } = require('../command');
const fs = require('fs');
const path = require('path');

// Allowed number
const SPECIAL_ALLOWED = "94713119712";

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
    pattern: "getranu",
    alias: ["sourceranu", "jsranu", "getpluginranu", "getpluginsranu"],
    desc: "Fetch the full source code of a command",
    category: "owner",
    react: "📜",
    filename: __filename
},
async (conn, mek, m, { from, args, reply, isOwner }) => {
    try {

        // Clean number format
        const senderNum = m.sender.replace("@s.whatsapp.net", "").replace("+", "");

        // Permission check
        if (!isOwner && senderNum !== SPECIAL_ALLOWED) {
            return reply("❌ You are not allowed to use this command!");
        }

        if (!args[0]) return reply("❌ Please provide a command name. Example: `.get alive`");

        const commandName = args[0].toLowerCase();
        const commandData = commands.find(c =>
            c.pattern === commandName ||
            (c.alias && c.alias.includes(commandName))
        );

        if (!commandData) return reply("❌ Command not found!");

        // Get code
        const fullCode = fs.readFileSync(commandData.filename, 'utf-8');

        // Truncate code for preview
        let truncatedCode = fullCode;
        if (truncatedCode.length > 4000) {
            truncatedCode = truncatedCode.substring(0, 4000) + "\n\n// Code too long, sending full file 📂";
        }

        const formattedCode = `⬤───〔 *📜 Command Source* 〕───⬤
\`\`\`js
${truncatedCode}
\`\`\`
╰──────────⊷  
⚡ Full file sent below 📂  
Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

        // Send IMAGE + Preview Code
        await conn.sendMessage(from, {
            image: {
                url: "https://i.ibb.co/C5PdQgTz/imgbb-1774247334984.jpg"
            },
            caption: formattedCode,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: false
            }
        }, { quoted: fakevCard });

        // Send Full File
        const fileName = `${commandName}.js`;
        const tempPath = path.join(__dirname, fileName);
        fs.writeFileSync(tempPath, fullCode);

        await conn.sendMessage(from, {
            document: fs.readFileSync(tempPath),
            mimetype: 'text/javascript',
            fileName: fileName
        }, { quoted: mek });

        fs.unlinkSync(tempPath);

    } catch (e) {
        console.error("GET CMD ERROR:", e);
        reply("❌ Error: " + e.message);
    }
});
