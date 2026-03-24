const { isJidGroup } = require('@whiskeysockets/baileys');
const { loadMessage, getAnti } = require('../data');
const config = require('../config');

const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update) => {
    const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || 'Unknown content';
    deleteInfo += `\n\n *⭕ DELETED MESSAGE:* ${messageContent}`;

    await conn.sendMessage(
        jid,
        {
            text: deleteInfo,
            contextInfo: {
                mentionedJid: isGroup
                    ? [update.key.participant, mek.key.participant]
                    : [update.key.remoteJid],
            },
        },
        { quoted: mek }
    );
};

const DeletedMedia = async (conn, mek, jid, deleteInfo) => {
    const antideletedmek = structuredClone(mek.message);
    const messageType = Object.keys(antideletedmek)[0];

    if (antideletedmek[messageType]) {
        antideletedmek[messageType].contextInfo = {
            stanzaId: mek.key.id,
            participant: mek.sender,
            quotedMessage: mek.message,
        };
    }

    if (messageType === 'imageMessage' || messageType === 'videoMessage') {
        antideletedmek[messageType].caption = deleteInfo;
    } else if (messageType === 'audioMessage' || messageType === 'documentMessage') {
        await conn.sendMessage(
            jid,
            { text: `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}` },
            { quoted: mek }
        );
    }

    await conn.relayMessage(jid, antideletedmek, {});
};

const AntiDelete = async (conn, updates) => {
    for (const update of updates) {
        // Only handle delete events
        if (update.update.message === null) {
            const store = await loadMessage(update.key.id);
            if (!store || !store.message) continue;

            const mek = store.message;
            const isGroup = isJidGroup(store.jid);
            const antiDeleteStatus = await getAnti();
            if (!antiDeleteStatus) continue;

            // 🛑 Skip if message was sent by the bot itself
            if (
                mek.key.fromMe ||
                update.key.participant === conn.user.id ||
                store.key?.participant === conn.user.id
            ) {
                continue;
            }

            // Always send to bot inbox
            const jid = conn.user.id;
            const deleteTime = new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            let deleteInfo;

            if (isGroup) {
                const groupMetadata = await conn.groupMetadata(store.jid);
                const groupName = groupMetadata.subject;
                const sender = mek.key.participant?.split('@')[0];
                const deleter = update.key.participant?.split('@')[0];

                deleteInfo = `*🤖 𝚁𝙰𝙽𝚄𝙼𝙸𝚃𝙷𝙰-𝚇-𝙼𝙳 Anti delete system status 🤖*

★👾 *SENDER:* @${sender}
★👨‍👩‍👦 *GROUP:* ${groupName}
★👤 *DELETED BY:* @${deleter}`;
            } else {
                const senderNumber = mek.key.remoteJid?.split('@')[0];
                deleteInfo = `*🤖 𝚁𝙰𝙽𝚄𝙼𝙸𝚃𝙷𝙰-𝚇-𝙼𝙳 Anti delete system status 🤖*

★🎭 *SENDER:* @${senderNumber}`;
            }

            // Send to bot inbox
            if (mek.message?.conversation || mek.message?.extendedTextMessage) {
                await DeletedText(conn, mek, jid, deleteInfo, isGroup, update);
            } else {
                await DeletedMedia(conn, mek, jid, deleteInfo);
            }
        }
    }
};

module.exports = {
    DeletedText,
    DeletedMedia,
    AntiDelete,
};
