const { cmd } = require('../command');
const config = require('../config');

cmd({
  pattern: "block",
  react: "🚫",
  desc: "Owner Only: Block replied user",
  category: "owner",
  use: "Reply to someone and type .block",
  filename: __filename
},
async (conn, mek, m, { from, isOwner }) => {

  const reply = async (text) =>
    await conn.sendMessage(from, { text }, { quoted: m });

  // OWNER CHECK
  if (!isOwner) return reply("🚫 *Owner Only Command!*");

  try {

    // CORRECT REPLY DETECTION FOR BAILEYS V7
    if (!m.quoted || !m.quoted.sender) {
      return reply("⚠️ *Reply to a user's message and type .block*");
    }

    // GET USER JID
    let targetJid = m.quoted.sender;

    // PROCESS REACT
    await conn.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    // SUCCESS MESSAGE
    await reply("*Block Successfully ✅*");

    // BLOCK AFTER SHORT DELAY
    setTimeout(async () => {

      if (typeof conn.updateBlockStatus === "function") {
        await conn.updateBlockStatus(targetJid, "block");
      } else if (typeof conn.blockUser === "function") {
        await conn.blockUser(targetJid);
      } else if (typeof conn.contactBlock === "function") {
        await conn.contactBlock(targetJid);
      }

      console.log("Blocked:", targetJid);

    }, 500);

  } catch (err) {
    await reply("❌ Block Failed!\n" + err);
  }
});
