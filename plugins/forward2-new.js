const { cmd } = require("../command");
const NodeCache = require("node-cache");
const {
  generateForwardMessageContent,
  generateWAMessageFromContent
} = require("@whiskeysockets/baileys");

// ===== Safety Configuration =====
const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,
  EXTRA_DELAY: 4000,
};

// ===== Duplicate Block Cache =====
const forwardCache = new NodeCache({ stdTTL: 300 });

function formatJid(jid) {
  if (!jid) return null;

  let clean = jid.replace(/(@g\.us|@s\.whatsapp\.net|@newsletter|@lid)$/i, "");
  if (!/^\d+$/.test(clean)) return null;

  if (jid.includes("@g.us")) return `${clean}@g.us`;
  if (jid.includes("@newsletter")) return `${clean}@newsletter`;
  if (jid.includes("@lid")) return `${clean}@lid`;
  if (jid.includes("@s.whatsapp.net")) return `${clean}@s.whatsapp.net`;

  if (clean.length > 15) return `${clean}@g.us`;
  return `${clean}@s.whatsapp.net`;
}

cmd({
  pattern: "forward3",
  alias: ["fwd3"],
  desc: "Safe Baileys Forward (2GB Supported)",
  category: "owner",
  filename: __filename
},
async (client, message, match, { isOwner }) => {
  try {

    if (!isOwner)
      return await message.reply("📛 *Owner Only Command*");

    if (!message.quoted)
      return await message.reply("🍁 *Reply to a message*");

    // ===== JID PROCESSING =====
    let jidInput = typeof match === "string"
      ? match.trim()
      : Array.isArray(match)
      ? match.join(" ").trim()
      : match?.text || "";

    const rawJids = jidInput.split(/[\s,]+/).filter(Boolean);

    const validJids = rawJids
      .map(formatJid)
      .filter(Boolean)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0)
      return await message.reply("❌ *No valid JIDs found!*");

    const quoted = message.quoted;

    let success = 0;
    const failed = [];

    for (let i = 0; i < validJids.length; i++) {
      const jid = validJids[i];

      try {

        const cacheKey = `${quoted.id}_${jid}`;
        if (forwardCache.has(cacheKey)) continue;

        // 🔥 TRUE BAILEYS FORWARD (NO RE-UPLOAD)
        const forwardContent = await generateForwardMessageContent(
          quoted,
          false
        );

        const waMessage = await generateWAMessageFromContent(
          jid,
          forwardContent,
          { userJid: client.user.id }
        );

        await client.relayMessage(
          jid,
          waMessage.message,
          { messageId: waMessage.key.id }
        );

        forwardCache.set(cacheKey, true);
        success++;

        // Progress Update
        if ((i + 1) % 10 === 0)
          await message.reply(`🔄 Sent ${i + 1}/${validJids.length}`);

        const delay =
          (i + 1) % 10 === 0
            ? SAFETY.EXTRA_DELAY
            : SAFETY.BASE_DELAY;

        await new Promise(r => setTimeout(r, delay));

      } catch {
        failed.push(jid);
        await new Promise(r => setTimeout(r, SAFETY.BASE_DELAY));
      }
    }

    let report =
      `✅ *Forward Completed*\n\n` +
      `📤 Success: ${success}/${validJids.length}`;

    if (failed.length)
      report += `\n❌ Failed: ${failed.join(", ")}`;

    await message.reply(report);

  } catch (e) {
    await message.reply("💢 Error: " + e.message);
  }
});
