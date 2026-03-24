const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

cmd({
  pattern: "gdrive2",
  desc: "Download original Google Drive files (2GB RAM safe).",
  react: "🌐",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q) return reply("❌ Please provide a Google Drive link.");

    await conn.sendMessage(from, { react: { text: "⬇️", key: m.key } });

    const fileId = q.match(/[-\w]{25,}/)?.[0];
    if (!fileId) return reply("⚠️ Invalid Google Drive link!");

    let url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // STEP 1 – Get confirmation token
    const step1 = await axios.get(url, { maxRedirects: 0, validateStatus: s => s === 200 || s === 302 });
    let confirm = null;
    if (step1.data.includes("confirm=")) {
      confirm = step1.data.match(/confirm=([0-9A-Za-z-_]+)/)?.[1];
    }
    const cookies = step1.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";

    const finalURL = confirm ? `https://drive.google.com/uc?export=download&confirm=${confirm}&id=${fileId}` : url;

    // STEP 2 – Stream download to temp file (low RAM)
    const tempFile = path.join(__dirname, `${fileId}.tmp`);
    const writer = fs.createWriteStream(tempFile);

    const response = await axios({
      url: finalURL,
      method: 'GET',
      responseType: 'stream',
      headers: { Cookie: cookies }
    });

    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => { error = err; writer.close(); reject(err); });
      writer.on('close', () => { if (!error) resolve(); });
    });

    // STEP 3 – Extract real filename
    const disposition = response.headers["content-disposition"] || "";
    const matchName = disposition.match(/filename="(.+?)"/);
    const fileName = matchName ? matchName[1] : `drive_${fileId}`;
    const mimeType = response.headers["content-type"] || "application/octet-stream";
    const finalPath = path.join(__dirname, fileName);
    fs.renameSync(tempFile, finalPath);

    await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

    // STEP 4 – Send file to chat
    await conn.sendMessage(
      from,
      {
        document: fs.readFileSync(finalPath),
        mimetype: mimeType,
        fileName: fileName,
        caption: "> *Original Google Drive File ✓*\n> *© SHAVIYA-XMD V4*"
      },
      { quoted: m }
    );

    fs.unlinkSync(finalPath);
    await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.log("GDRIVE ERROR:", err?.response?.status || err);
    reply("❌ Could not download. File may be private, not shared publicly, or too large. Make sure the link is public.");
  }
});
