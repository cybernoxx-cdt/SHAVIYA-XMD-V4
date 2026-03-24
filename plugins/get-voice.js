const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "getvoice",
  alias: ["gv"],
  desc: "Convert replied video/audio or URL to WhatsApp Voice Note",
  category: "owner",
  react: "🎤",
  use: ".gv <reply/video/audio/url>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let mediaBuffer;

    // -------- IF USER REPLIED TO VIDEO / AUDIO -----------
    if (m.quoted) {
      let type = m.quoted.mtype;

      if (type === "videoMessage" || type === "audioMessage") {
        mediaBuffer = await m.quoted.download();
      } else {
        return reply("⚠️ *Please reply to a video or audio!*");
      }
    }

    // -------- IF PROVIDED AUDIO URL -----------------------
    else if (q) {
      const audioUrl = q.trim();
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) throw new Error("Invalid audio URL");
      mediaBuffer = Buffer.from(await audioRes.arrayBuffer());
    } 
    
    else {
      return reply("⚠️ *Reply to a video/audio or give me a URL!*");
    }

    // Reaction: Downloading
    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    const voicePath = path.join(__dirname, `../temp/${Date.now()}.opus`);

    fs.writeFileSync(tempPath, mediaBuffer);

    // Reaction: Converting
    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    // -------- CONVERT TO VOICE NOTE (OPUS) ----------------
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .audioCodec("libopus")
        .format("opus")
        .audioBitrate("64k")
        .on("end", resolve)
        .on("error", reject)
        .save(voicePath);
    });

    const voiceBuffer = fs.readFileSync(voicePath);

    // SEND WHATSAPP VOICE NOTE
    await conn.sendMessage(from, {
      audio: voiceBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // Cleanup
    fs.unlinkSync(tempPath);
    fs.unlinkSync(voicePath);

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { react: { text: "🎤", key: mek.key } });
    reply("*Error*");
  }
});
