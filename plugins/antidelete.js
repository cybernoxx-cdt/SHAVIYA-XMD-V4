// ============================================
//   plugins/antidelete.js - SHAVIYA-XMD V4
//   FIXED: antidelete default OFF, proper toggle
// ============================================

const { getSetting } = require('../lib/settings');

const msgCache = new Map();
const MAX_CACHE = 2000;

// Auto clean every 30 min
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of msgCache.entries()) {
        if (now - val.timestamp > 3600000) msgCache.delete(key);
    }
}, 1800000);

async function onMessage(conn, mek, sessionId) {
    try {
        if (!mek?.message) return;
        if (mek.key.fromMe) return;

        const msgContent = mek.message?.ephemeralMessage?.message || mek.message;
        if (!msgContent) return;

        const key     = mek.key.id;
        const chat    = mek.key.remoteJid;
        const isGroup = chat?.endsWith('@g.us');
        const sender  = isGroup ? (mek.key.participant || mek.participant || chat) : chat;

        msgCache.set(key, {
            mek, msgContent, timestamp: Date.now(),
            chat, sender, isGroup,
            pushName: mek.pushName || '', sessionId
        });

        if (msgCache.size > MAX_CACHE) {
            const firstKey = msgCache.keys().next().value;
            msgCache.delete(firstKey);
        }
    } catch (e) {
        // silent
    }
}

async function onDelete(conn, deletion, sessionId) {
    try {
        // Check if antidelete is enabled in settings
        const enabled = getSetting('antidelete');
        if (!enabled) return; // OFF by default

        const deletedKey = deletion.key?.id;
        if (!deletedKey) return;

        const cached = msgCache.get(deletedKey);
        if (!cached) return;

        const { mek, msgContent, chat, sender, pushName } = cached;

        // Get sender display name
        let senderName = pushName || sender.split('@')[0];
        let senderNum  = sender.replace('@s.whatsapp.net','').replace('@lid','').replace('@g.us','');

        const header = `╭━━〔 🗑️ *DELETED MESSAGE* 〕━━⬣\n┃\n┃ 👤 *From* : ${senderName}\n┃ 📱 *Number* : +${senderNum}\n┃\n╰━━━━━━━━━━━━━━━━━━━⬣`;

        const msgType = Object.keys(msgContent)[0];

        // Text message
        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const text = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
            await conn.sendMessage(chat, { text: `${header}\n\n💬 *Message:*\n${text}` });
            return;
        }

        // Image
        if (msgType === 'imageMessage') {
            try {
                const buffer = await conn.downloadMediaMessage(mek);
                const caption = msgContent.imageMessage?.caption || '';
                await conn.sendMessage(chat, {
                    image: buffer,
                    caption: `${header}\n\n🖼️ *Image${caption ? ': ' + caption : ''}*`
                });
            } catch { await conn.sendMessage(chat, { text: `${header}\n\n🖼️ *[Image deleted]*` }); }
            return;
        }

        // Video
        if (msgType === 'videoMessage') {
            try {
                const buffer = await conn.downloadMediaMessage(mek);
                const caption = msgContent.videoMessage?.caption || '';
                await conn.sendMessage(chat, {
                    video: buffer,
                    caption: `${header}\n\n🎥 *Video${caption ? ': ' + caption : ''}*`
                });
            } catch { await conn.sendMessage(chat, { text: `${header}\n\n🎥 *[Video deleted]*` }); }
            return;
        }

        // Audio / PTT
        if (msgType === 'audioMessage') {
            try {
                const buffer = await conn.downloadMediaMessage(mek);
                const isPtt  = msgContent.audioMessage?.ptt;
                await conn.sendMessage(chat, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: isPtt || false,
                    caption: header
                });
            } catch { await conn.sendMessage(chat, { text: `${header}\n\n🎵 *[Audio deleted]*` }); }
            return;
        }

        // Sticker
        if (msgType === 'stickerMessage') {
            try {
                const buffer = await conn.downloadMediaMessage(mek);
                await conn.sendMessage(chat, { sticker: buffer });
                await conn.sendMessage(chat, { text: `${header}\n\n🎭 *Sticker deleted*` });
            } catch { await conn.sendMessage(chat, { text: `${header}\n\n🎭 *[Sticker deleted]*` }); }
            return;
        }

        // Document
        if (msgType === 'documentMessage') {
            try {
                const buffer = await conn.downloadMediaMessage(mek);
                const fname  = msgContent.documentMessage?.fileName || 'file';
                const mime   = msgContent.documentMessage?.mimetype || 'application/octet-stream';
                await conn.sendMessage(chat, {
                    document: buffer,
                    fileName: fname,
                    mimetype: mime,
                    caption: `${header}\n\n📄 *Document: ${fname}*`
                });
            } catch { await conn.sendMessage(chat, { text: `${header}\n\n📄 *[Document deleted]*` }); }
            return;
        }

        // Default fallback
        await conn.sendMessage(chat, { text: `${header}\n\n📩 *[${msgType} deleted]*` });

    } catch (e) {
        console.error('AntiDelete error:', e.message);
    }
}

module.exports = { onMessage, onDelete };
