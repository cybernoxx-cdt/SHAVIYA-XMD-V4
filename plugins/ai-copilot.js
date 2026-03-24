const { cmd } = require('../command');
const axios = require('axios');

// Fake VCard
const FakeVCard = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast"
  },
  message: {
    contactMessage: {
      displayName: "© SHAVIYA TECH (Copilot Ai) 🔖",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:SHAVIYA-XMD V4
ORG:SHAVIYA TECH;
TEL;type=CELL;type=VOICE;waid=18772241042:+18772241042
END:VCARD`
    }
  }
};

cmd({
  pattern: "copilot",
  alias: [ "ai", "ai1" ],
  desc: "Chat with an AI model",
  category: "ai",
  react: "🤖",
  filename: __filename
},
async (conn, mek, m, { from, q, react }) => {
  try {

    // ✅ Get text from command OR replied message
    let userText = q?.trim();

    if (!userText && m?.quoted) {
      userText =
        m.quoted.message?.conversation ||
        m.quoted.message?.extendedTextMessage?.text ||
        m.quoted.text;
    }

    // ❌ If no text provided
    if (!userText) {
      return conn.sendMessage(
        from,
        {
          text: `🧠 *Please provide a message for the AI.*

📌 Example:
• .copilot \`Hello\`
• Reply to a message and type \`.copilot\``
        },
        { quoted: m }
      );
    }

    const apiUrl = `https://malvin-api.vercel.app/ai/copilot?text=${encodeURIComponent(userText)}`;
    const { data } = await axios.get(apiUrl);

    if (!data?.status || !data?.result) return;

    const responseMsg = `
🤖 *Microsoft Copilot AI Response*
━━━━━━━━━━━━━━━
${data.result}

> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛
`.trim();

    await conn.sendMessage(
      from,
      { text: responseMsg },
      { quoted: FakeVCard }
    );

    await react("✅");

  } catch (e) {
    console.log("Copilot error:", e.message);
  }
});
