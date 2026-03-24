/**
 * SHAVIYA-XMD V4 — Reply Handler
 * Fixes: After bot restart, users who reply to old bot messages
 * (like .song / .video / .tiktok selection menus) get a helpful
 * prompt to re-run their command instead of getting no response.
 */

const { cmd } = require("../command");

// Store active menu sessions: key = "from:targetMsgId", value = { type, data, timestamp }
global._menuSessions = global._menuSessions || new Map();

// Clean up sessions older than 15 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of global._menuSessions.entries()) {
        if (now - val.timestamp > 15 * 60 * 1000) {
            global._menuSessions.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Register a menu session so replies work even after re-registration
 * Call this from your download plugins after sending the selection menu
 */
global.registerMenuSession = function(from, msgId, type, data) {
    const key = `${from}:${msgId}`;
    global._menuSessions.set(key, { type, data, timestamp: Date.now() });
};

/**
 * Enhanced listenForReplies - works across restarts by using global session store
 */
global.listenForReplies = function(conn, from, sender, targetId, callback) {
    const handler = (update) => {
        const msg = update.messages?.[0];
        if (!msg?.message) return;
        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
        const context = msg.message?.extendedTextMessage?.contextInfo;
        const msgSender = msg.key.participant || msg.key.remoteJid;
        if (
            msg.key.remoteJid === from &&
            (msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid")) &&
            context?.stanzaId === targetId
        ) {
            callback({ msg, text: text.trim() });
        }
    };
    conn.ev.on("messages.upsert", handler);
    // Auto remove after 15 minutes
    setTimeout(() => conn.ev.off("messages.upsert", handler), 900000);
};

// Handle replies to bot messages that have no active listener (after restart)
cmd({
    on: "body",
    pattern: /^.*/,
    desc: "Internal: handle orphaned replies after restart",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { from, body, sender, reply }) => {
    try {
        // Only handle if this is a reply to another message
        const context = mek.message?.extendedTextMessage?.contextInfo;
        if (!context?.stanzaId) return;

        const quotedParticipant = context.participant || context.remoteJid;
        const botJid = conn.user?.id;
        if (!botJid) return;

        const botNumber = botJid.split(":")[0].split("@")[0];
        const isReplyToBot = quotedParticipant?.includes(botNumber) || context.fromMe;
        if (!isReplyToBot) return;

        // Check if there's an active menu session for this message
        const sessionKey = `${from}:${context.stanzaId}`;
        if (global._menuSessions?.has(sessionKey)) return; // Already handled by plugin

        // Check if the replied message looks like a bot menu (has numbered options)
        const quotedText = context.quotedMessage?.conversation ||
                           context.quotedMessage?.extendedTextMessage?.text ||
                           context.quotedMessage?.imageMessage?.caption || "";

        const hasNumberedOptions = /[1-9]\s*[┃|]\s*\w/.test(quotedText);
        if (!hasNumberedOptions) return;

        // The bot restarted and lost the listener — guide the user
        await conn.sendMessage(from, {
            text: `⚠️ *Bot was restarted!*\n\nYour selection could not be processed.\n\nPlease run the command again:\n\n` +
                  `🎶 Song → *.song <name>*\n` +
                  `🎬 Video → *.video <name>*\n` +
                  `🛟 TikTok → *.tiktok <url>*\n` +
                  `🔎 TikTok Search → *.tiktoksearch <query>*\n\n` +
                  `> © 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎`,
        }, { quoted: mek });

    } catch (e) {
        // Silent fail — don't crash bot
    }
});
