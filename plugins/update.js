const { cmd } = require("../command");
const axios = require('axios');
const fs = require('fs');
const path = require("path");
const AdmZip = require("adm-zip");

cmd({
    pattern: "update",
    alias: ["upgrade", "sync"],
    react: '🔁',
    desc: "Update bot to latest version.",
    category: "owner",
    filename: __filename
}, async (client, message, args, { reply, isOwner }) => {
    if (!isOwner) return reply("*🚫 Owner only!*");
    try {
        await reply("🔍 Checking for updates...");
        const { data: commitData } = await axios.get(
            "https://api.github.com/repos/yourusername/SHAVIYA-XMD-V4/commits/main",
            { timeout: 10000 }
        );
        await reply(`🚀 Latest commit: ${commitData.sha?.slice(0,7)}\n📝 ${commitData.commit?.message || 'No message'}\n\n⬇️ Downloading...`);

        const zipPath = path.join(__dirname, "latest_v4.zip");
        const { data: zipData } = await axios.get(
            "https://github.com/cybernoxx-cdt/SHAVIYA-XMD-V4/archive/main.zip",
            { responseType: "arraybuffer", timeout: 30000 }
        );
        fs.writeFileSync(zipPath, zipData);

        await reply("📦 Extracting...");
        const extractPath = path.join(__dirname, 'latest_v4');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        const sourcePath = path.join(extractPath, "SHAVIYA-XMD-V4-main");
        copyFolderSync(sourcePath, path.join(__dirname, '..'));

        fs.unlinkSync(zipPath);
        fs.rmSync(extractPath, { recursive: true, force: true });

        await reply("✅ Update complete! Restarting...");
        process.exit(0);
    } catch (error) {
        console.error("Update error:", error);
        reply(`❌ Update failed: ${error.message}`);
    }
});

function copyFolderSync(source, target) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    for (const item of fs.readdirSync(source)) {
        if (['config.js', '.env', 'auth_info_baileys', 'data'].includes(item)) continue;
        const srcPath = path.join(source, item);
        const destPath = path.join(target, item);
        if (fs.lstatSync(srcPath).isDirectory()) copyFolderSync(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}
