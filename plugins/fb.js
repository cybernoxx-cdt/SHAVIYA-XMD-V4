const axios = require("axios");
const { cmd } = require('../command');

// Fake ChatGPT vCard
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
  pattern: "fb",
  alias: ["facebook", "fbvideo", "facebookvideo"], 
  desc: "Download Facebook videos",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    // ✅ Determine FB URL from command or replied message
    let fbUrl = q?.trim();

    if (!fbUrl && m?.quoted) {
        fbUrl = 
            m.quoted.message?.conversation ||
            m.quoted.message?.extendedTextMessage?.text ||
            m.quoted.text;
    }

    if (!fbUrl || !fbUrl.startsWith("https://")) {
      return conn.sendMessage(from, { text: "*🚩 Please provide a valid Facebook URL 🐼 or reply to the URL.*" }, { quoted: m });
    }

    await conn.sendMessage(from, { react: { text: '🎥', key: m.key } });

    // ✅ Fetch data from API
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(fbUrl)}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data?.status || !data?.data) {
      return reply("⚠️ Failed to retrieve Facebook media. Please check the link and try again.");
    }

    const { title, low, high } = data.data;

    const fixedThumbnail = "https://i.ibb.co/C5PdQgTz/imgbb-1774247334984.jpg";

    const caption = `
🎥 *SHAVIYA-XMD V4 FACEBOOK DOWNLOADER* 🎥

📑 *Title:* ${title || "No title"}
🔗 *Link:* ${fbUrl}

💬 *Reply with your choice:*

 1️⃣ HD Quality🔋
 2️⃣ SD Quality🪫
 3️⃣ Audio Type 🎶

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: fixedThumbnail },
      caption: caption
    }, { quoted: fakevCard });

    const messageID = sentMsg.key.id;

    // 🧠 Reply listener
    conn.ev.on("messages.upsert", async (msgData) => {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg?.message) return;

      const receivedText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
      const senderID = receivedMsg.key.remoteJid;
      const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (isReplyToBot) {
        await conn.sendMessage(senderID, { react: { text: '⬇️', key: receivedMsg.key } });

        const thumbBuffer = await (await axios.get(fixedThumbnail, { responseType: 'arraybuffer' })).data;
        let mediaMsg;

        switch (receivedText.trim()) {
          case "1":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            mediaMsg = await conn.sendMessage(senderID, {
              video: { url: high },
              mimetype: "video/mp4",
              caption: "*HD Quality Video* 🔋",
              thumbnail: thumbBuffer
            }, { quoted: receivedMsg });
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;
            
          case "2":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            mediaMsg = await conn.sendMessage(senderID, {
              video: { url: low },
              mimetype: "video/mp4",
              caption: "*SD Quality Video* 🪫",
              thumbnail: thumbBuffer
            }, { quoted: receivedMsg });
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;

          case "3":
            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
            mediaMsg = await conn.sendMessage(senderID, { 
              audio: { url: low || high }, 
              mimetype: "audio/mp4", 
              ptt: false 
            }, { quoted: receivedMsg });
            await conn.sendMessage(senderID, { react: { text: '✔️', key: receivedMsg.key } });
            break;

          default:
            await conn.sendMessage(senderID, { react: { text: '😒', key: receivedMsg.key } });
            reply("*❌ Invalid option!*");
        }
      }
    });

  } catch (error) {
    console.error("*FB Plugin Error*:", error);
    reply("*Error downloading or sending video.*");
  }
});
