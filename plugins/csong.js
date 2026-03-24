const { cmd } = require("../command");

const fetch = require("node-fetch");

const fs = require("fs");

const path = require("path");

const ffmpeg = require("fluent-ffmpeg");

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

// Convert "3:17" → 197 seconds

function toSeconds(time) {

    if (!time) return 0;

    const p = time.split(":").map(Number);

    return (p.length === 2) ? p[0] * 60 + p[1] : parseInt(time);

}

cmd({

  pattern: "csong",

  alias: ["chsong", "channelplay"],

  react: "🍁",

  desc: "Send a YouTube song to a WhatsApp Channel (voice + details)",

  category: "channel",

  use: ".csong <song name>/<channel JID>",

  filename: __filename,

}, async (conn, mek, m, { from, reply, q }) => {

  try {

    if (!q || !q.includes("/")) {

      return reply("⚠️ Use format:\n.csong <song name>/<channel JID>\n\nExample:\n.csong Shape of You/1203630xxxxx@newsletter");

    }

    const [songName, channelJid] = q.split("/").map(x => x.trim());

    if (!channelJid.endsWith("@newsletter")) {

      return reply("❌ Invalid channel JID! It should end with @newsletter");

    }

    if (!songName) return reply("⚠️ Please provide a song name.");

    const apiUrl = `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${encodeURIComponent(songName)}`;

    const res = await fetch(apiUrl);

    const data = await res.json();

    if (!data?.success || !data?.result?.downloadUrl) {

      return reply("❌ Song not found or API error.");

    }

    const meta = data.result.metadata;

    const dlUrl = data.result.downloadUrl;

    // Fetch thumbnail

    let buffer;

    try {

      const thumbRes = await fetch(meta.cover);

      buffer = Buffer.from(await thumbRes.arrayBuffer());

    } catch {

      buffer = null;

    }

    const caption = `🎶 *SHAVIYA-XMD V4 SONG SENDER* 🎶

*🎧 Title* : ${meta.title}
*🫟 Channel*: ${meta.channel}
*🕐 Time* : ${meta.duration}

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

    // Send details + image to channel

    await conn.sendMessage(channelJid, {

      image: buffer,

      caption: caption

    }, { quoted: fakevCard });

    // Convert to voice (.opus)

    const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp3`);

    const voicePath = path.join(__dirname, `../temp/${Date.now()}.opus`);

    const audioRes = await fetch(dlUrl);

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    fs.writeFileSync(tempPath, audioBuffer);

    await new Promise((resolve, reject) => {

      ffmpeg(tempPath)

        .audioCodec("libopus")

        .format("opus")

        .audioBitrate("64k")

        .save(voicePath)

        .on("end", resolve)

        .on("error", reject);

    });

    const voiceBuffer = fs.readFileSync(voicePath);

    const durationSeconds = toSeconds(meta.duration);

    // SEND VOICE WITH FULL DURATION

    await conn.sendMessage(channelJid, {

      audio: voiceBuffer,

      mimetype: "audio/ogg; codecs=opus",

      ptt: true,

      seconds: durationSeconds   // FIXED ✔

    }, { quoted: fakevCard });

    // Clean temp

    fs.unlinkSync(tempPath);

    fs.unlinkSync(voicePath);

    reply(`*✅ Song sent successfully*\n\n*🎧 Song Title* :- ${meta.title}\n*🔖 Channel jid* :- ${channelJid}`);

  } catch (err) {

    console.error("csong error:", err);

    reply("⚠️ Error while sending song to channel.");

  }

});
