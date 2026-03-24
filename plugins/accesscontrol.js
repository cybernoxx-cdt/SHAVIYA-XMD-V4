const config = require('../config');
// ============================================
//   plugins/accesscontrol.js
//   Complete Access Control & Premium System
// ============================================

const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Data file paths
const dataDir = path.join(__dirname, '../data');
const settingsFile = path.join(dataDir, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Default settings
const defaultSettings = {
    mode: 'public',
    premiumUsers: {},
    antiLink: false,
    antiBadWords: false,
    welcomeMessage: true,
    autoRead: true,
    autoBio: false,
    autoReact: true,
    autoStatusView: false,
    commandCooldown: 3,
    maxUsers: 1000,
    bannedUsers: [],
    allowedGroups: [],
    pluginStatus: {},
    lastUpdated: Date.now()
};

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            const data = fs.readFileSync(settingsFile, 'utf8');
            const settings = JSON.parse(data);
            return { ...defaultSettings, ...settings };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return { ...defaultSettings };
}

// Save settings to file
function saveSettings(settings) {
    try {
        settings.lastUpdated = Date.now();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// Get a specific setting
function getSetting(key) {
    const settings = loadSettings();
    return settings[key];
}

// Set a specific setting
function setSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    return saveSettings(settings);
}

// Get all settings
function getAllSettings() {
    return loadSettings();
}

// Check if user is premium
function isPremium(userJid) {
    const settings = loadSettings();
    const premiumUsers = settings.premiumUsers || {};
    
    // Handle old array format
    if (Array.isArray(premiumUsers)) {
        return premiumUsers.includes(userJid);
    }
    
    const userData = premiumUsers[userJid];
    if (!userData) return false;
    
    // Check expiry
    return userData.expiresAt > Date.now();
}

// Check if user is owner
function isOwner(userJid) {
    const owners = [config.OWNER_NUMBER ? config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : '94707085822@s.whatsapp.net'];
    return owners.includes(userJid);
}

// Check command access based on mode
function hasCommandAccess(userJid, isGroup) {
    const mode = getSetting('mode');
    const userIsPremium = isPremium(userJid);
    const userIsOwner = isOwner(userJid);
    
    // Owner always has access
    if (userIsOwner) return true;
    
    switch(mode) {
        case 'private':
            return false;
        case 'inbox':
            return !isGroup;
        case 'group':
            return isGroup;
        case 'premium':
            return userIsPremium;
        case 'privatepremium':
            return !isGroup && userIsPremium;
        case 'public':
        default:
            return true;
    }
}

// Get premium expiry date
function getPremiumExpiry(userJid) {
    const settings = loadSettings();
    const premiumUsers = settings.premiumUsers || {};
    
    if (Array.isArray(premiumUsers)) return null;
    
    const userData = premiumUsers[userJid];
    return userData ? userData.expiresAt : null;
}

// Check if user is banned
function isBanned(userJid) {
    const bannedUsers = getSetting('bannedUsers') || [];
    return bannedUsers.some(user => user.jid === userJid);
}

// ── SET MODE ──────────────────────────────────
cmd({
    pattern: 'setmode',
    alias: ['mode'],
    desc: 'Set bot mode (public/private/inbox/group/premium/privatepremium)',
    category: 'settings',
    react: '🔐',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const validModes = ['public', 'private', 'inbox', 'group', 'premium', 'privatepremium'];
    
    const modeDesc = {
        'public': 'Everyone can use the bot',
        'private': 'Only owner can use',
        'inbox': 'Only works in private chats',
        'group': 'Only works in groups',
        'premium': 'Only premium users can use',
        'privatepremium': 'Premium users + private chats only'
    };

    if (!q) {
        const current = getSetting('mode');
        return reply(`🔐 *Current Bot Mode:* *${current}*\n\n📋 *Available Modes:*\n${validModes.map(m => `├ *${m}* - ${modeDesc[m]}`).join('\n')}\n\n*Usage:* .setmode <mode>`);
    }

    const selectedMode = q.toLowerCase();
    if (!validModes.includes(selectedMode)) {
        return reply(`❌ *Invalid mode!*\n\n*Valid modes:*\n${validModes.map(m => `├ ${m}`).join('\n')}`);
    }

    setSetting('mode', selectedMode);
    
    const updateMsg = `✅ *Bot Mode Updated!*\n\n🔐 *New Mode:* *${selectedMode}*\n📝 *Description:* ${modeDesc[selectedMode]}\n\n⚡ Bot behavior has been updated!`;
    
    reply(updateMsg);
});

// ── ADD PREMIUM ───────────────────────────────
cmd({
    pattern: 'addpremium',
    alias: ['ap', 'addprem'],
    desc: 'Add premium user with duration',
    category: 'settings',
    react: '💎',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, quoted, from }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let number = q ? q.split(' ')[0].replace(/[^0-9]/g, '') :
                 quoted ? quoted.sender.split('@')[0] : null;

    if (!number) return reply('📝 *Usage:* .addpremium 94712345678 [days]\n\n*Example:* .addpremium 94712345678 30\n\nOr reply to a user message.');

    let duration = 365;
    const durationMatch = q ? q.match(/\d+/) : null;
    if (durationMatch) {
        duration = parseInt(durationMatch[0]);
    }

    const jid = number + '@s.whatsapp.net';
    let premiumUsers = getSetting('premiumUsers') || {};
    
    if (Array.isArray(premiumUsers)) {
        const newObj = {};
        premiumUsers.forEach(user => {
            newObj[user] = {
                addedAt: Date.now(),
                expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
                addedBy: m.sender
            };
        });
        premiumUsers = newObj;
    }

    if (premiumUsers[jid]) {
        const expiryDate = new Date(premiumUsers[jid].expiresAt);
        return reply(`⚠️ *@${number} is already premium!*\n\n📅 *Expires:* ${expiryDate.toLocaleDateString()}\n\nUse *.extendpremium* to extend duration.`);
    }

    const expiresAt = Date.now() + (duration * 24 * 60 * 60 * 1000);
    premiumUsers[jid] = {
        addedAt: Date.now(),
        expiresAt: expiresAt,
        addedBy: m.sender,
        duration: duration
    };
    
    setSetting('premiumUsers', premiumUsers);
    
    const expiryDate = new Date(expiresAt);
    reply(`✅ *@${number} added as Premium user!* 💎\n\n📅 *Duration:* ${duration} days\n📆 *Expires:* ${expiryDate.toLocaleDateString()}\n\n*Premium features unlocked!*`);
    
    try {
        await conn.sendMessage(jid, {
            text: `🎉 *Congratulations!*\n\nYou have been granted *PREMIUM ACCESS* to SHAVIYA-XMD V2 Bot! 💎\n\n📅 *Valid until:* ${expiryDate.toLocaleDateString()}\n\n✨ *Premium Features:*\n├ Unlimited usage\n├ Priority support\n├ Exclusive commands\n├ No restrictions\n└ 24/7 access\n\nEnjoy the premium experience! 🚀`
        });
    } catch(e) {
        console.log('Could not notify premium user:', e);
    }
});

// ── EXTEND PREMIUM ────────────────────────────
cmd({
    pattern: 'extendpremium',
    alias: ['ep', 'extend'],
    desc: 'Extend premium user duration',
    category: 'settings',
    react: '⏰',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, quoted }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let number = q ? q.split(' ')[0].replace(/[^0-9]/g, '') :
                 quoted ? quoted.sender.split('@')[0] : null;
    
    let days = q ? parseInt(q.split(' ')[1]) : 30;
    
    if (!number) return reply('📝 *Usage:* .extendpremium 94712345678 30\n\nOr reply to a user message.');

    const jid = number + '@s.whatsapp.net';
    let premiumUsers = getSetting('premiumUsers') || {};
    
    if (!premiumUsers[jid]) {
        return reply(`⚠️ *@${number} is not a premium user!\n\nUse .addpremium to add them first.*`);
    }

    const currentExpiry = premiumUsers[jid].expiresAt;
    const newExpiry = currentExpiry + (days * 24 * 60 * 60 * 1000);
    
    premiumUsers[jid].expiresAt = newExpiry;
    premiumUsers[jid].extendedBy = m.sender;
    premiumUsers[jid].lastExtended = Date.now();
    
    setSetting('premiumUsers', premiumUsers);
    
    const newExpiryDate = new Date(newExpiry);
    reply(`✅ *Premium extended for @${number}!* ⏰\n\n📅 *New expiry:* ${newExpiryDate.toLocaleDateString()}\n➕ *Added:* ${days} days`);
});

// ── REMOVE PREMIUM ────────────────────────────
cmd({
    pattern: 'removepremium',
    alias: ['rp', 'delpremium', 'rmprem'],
    desc: 'Remove premium user',
    category: 'settings',
    react: '🗑️',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, quoted }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let number = q ? q.replace(/[^0-9]/g, '') :
                 quoted ? quoted.sender.split('@')[0] : null;

    if (!number) return reply('📝 *Usage:* .removepremium 94712345678\n\nOr reply to a user message.');

    const jid = number + '@s.whatsapp.net';
    let premiumUsers = getSetting('premiumUsers') || {};

    if (!premiumUsers[jid]) return reply(`⚠️ *@${number} is not a premium user!*`);

    delete premiumUsers[jid];
    setSetting('premiumUsers', premiumUsers);
    
    reply(`✅ *@${number} removed from Premium!*`);
    
    try {
        await conn.sendMessage(jid, {
            text: `⚠️ *Premium Access Revoked*\n\nYour premium access to SHAVIYA-XMD V2 Bot has been removed.\n\nContact owner for more information.`
        });
    } catch(e) {}
});

// ── PREMIUM LIST ──────────────────────────────
cmd({
    pattern: 'premiumlist',
    alias: ['plist', 'premlist', 'premiums'],
    desc: 'List all premium users with details',
    category: 'settings',
    react: '📋',
    filename: __filename
},
async (conn, mek, m, { isOwner, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let premiumUsers = getSetting('premiumUsers') || {};
    
    if (Array.isArray(premiumUsers)) {
        const newObj = {};
        premiumUsers.forEach(user => {
            newObj[user] = {
                addedAt: Date.now(),
                expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
            };
        });
        premiumUsers = newObj;
    }

    const premiumArray = Object.entries(premiumUsers);
    
    if (premiumArray.length === 0) return reply('💎 *No premium users found.*\n\nUse .addpremium to add users.');

    let active = 0;
    let expired = 0;
    const now = Date.now();
    
    let list = `💎 *PREMIUM USERS LIST* 💎\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    premiumArray.forEach(([jid, data], i) => {
        const expiresAt = data.expiresAt;
        const isValid = expiresAt > now;
        
        if (isValid) active++;
        else expired++;
        
        const expiryDate = new Date(expiresAt);
        const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
        
        list += `${i + 1}. @${jid.split('@')[0]}\n`;
        list += `   ├ 📅 Added: ${new Date(data.addedAt).toLocaleDateString()}\n`;
        list += `   ├ ⏰ Expires: ${expiryDate.toLocaleDateString()}\n`;
        list += `   └ 💫 Status: ${isValid ? `✅ Active (${daysLeft} days left)` : '❌ Expired'}\n\n`;
    });
    
    list += `━━━━━━━━━━━━━━━━━━━━\n`;
    list += `📊 *Statistics:*\n`;
    list += `├ 🟢 Active: ${active}\n`;
    list += `└ 🔴 Expired: ${expired}\n`;
    list += `━━━━━━━━━━━━━━━━━━━━\n`;
    list += `Total Premium Users: ${premiumArray.length}`;

    const mentions = premiumArray.map(([jid]) => jid);
    
    await conn.sendMessage(from, {
        text: list,
        mentions: mentions
    }, { quoted: mek });
});

// ── CHECK PREMIUM STATUS ──────────────────────────────
cmd({
    pattern: 'checkpremium',
    alias: ['mypremium', 'premstatus'],
    desc: 'Check your premium status',
    category: 'settings',
    react: '🔍',
    filename: __filename
},
async (conn, mek, m, { sender, reply, from }) => {
    let premiumUsers = getSetting('premiumUsers') || {};
    
    if (Array.isArray(premiumUsers)) {
        const newObj = {};
        premiumUsers.forEach(user => {
            newObj[user] = {
                addedAt: Date.now(),
                expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
            };
        });
        premiumUsers = newObj;
    }
    
    const userData = premiumUsers[sender];
    
    if (!userData) {
        return reply(`🔍 *Premium Status*\n\n💎 *Status:* Free User\n\n✨ *Upgrade to Premium:*\nContact owner to get premium access!\n\n📞 Owner: +94707085822`);
    }
    
    const now = Date.now();
    const isValid = userData.expiresAt > now;
    const daysLeft = Math.ceil((userData.expiresAt - now) / (1000 * 60 * 60 * 24));
    const expiryDate = new Date(userData.expiresAt);
    
    let statusMsg = `💎 *PREMIUM STATUS* 💎\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    statusMsg += `👤 *User:* @${sender.split('@')[0]}\n`;
    statusMsg += `🎫 *Status:* ${isValid ? '✅ Active Premium' : '❌ Expired'}\n`;
    
    if (isValid) {
        statusMsg += `⏰ *Days Left:* ${daysLeft} days\n`;
        statusMsg += `📅 *Expires:* ${expiryDate.toLocaleDateString()}\n`;
        statusMsg += `📆 *Added:* ${new Date(userData.addedAt).toLocaleDateString()}\n\n`;
        statusMsg += `✨ *Premium Features:*\n`;
        statusMsg += `├ Unlimited commands\n`;
        statusMsg += `├ Priority support\n`;
        statusMsg += `├ Exclusive features\n`;
        statusMsg += `└ No restrictions\n`;
    } else {
        statusMsg += `\n⚠️ *Premium has expired!*\nRenew to continue enjoying premium features.\n`;
    }
    
    await conn.sendMessage(from, {
        text: statusMsg,
        mentions: [sender]
    }, { quoted: mek });
});

// ── MY MODE ───────────────────────────────────
cmd({
    pattern: 'mymode',
    alias: ['botmode', 'status'],
    desc: 'Check current bot mode and your status',
    category: 'settings',
    react: '🔍',
    filename: __filename
},
async (conn, mek, m, { sender, reply, from }) => {
    const mode = getSetting('mode');
    let premiumUsers = getSetting('premiumUsers') || {};
    
    if (Array.isArray(premiumUsers)) {
        const newObj = {};
        premiumUsers.forEach(user => {
            newObj[user] = {
                addedAt: Date.now(),
                expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
            };
        });
        premiumUsers = newObj;
    }
    
    const isPrem = premiumUsers[sender] && premiumUsers[sender].expiresAt > Date.now();
    
    const modeInfo = {
        'public': '🟢 *Public Mode* - Everyone can use the bot',
        'private': '🔴 *Private Mode* - Only owner can use',
        'inbox': '📩 *Inbox Mode* - Only works in private chats',
        'group': '👥 *Group Mode* - Only works in groups',
        'premium': '💎 *Premium Mode* - Only premium users can use',
        'privatepremium': '💎📩 *Private Premium Mode* - Premium users + private chats only'
    };
    
    let statusMsg = `🔍 *BOT STATUS* 🔍\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    statusMsg += `${modeInfo[mode] || `🔐 *Mode:* ${mode}`}\n\n`;
    statusMsg += `👤 *Your Status:*\n`;
    statusMsg += `${isPrem ? '💎 *Premium User* ✅\n├ Unlimited access\n└ Priority support' : '🆓 *Free User*\n├ Limited access\n└ Upgrade to premium for more'}\n\n`;
    statusMsg += `📊 *Bot Info:*\n`;
    statusMsg += `├ *Version:* 2.0.0\n`;
    statusMsg += `├ *Type:* Premium Edition\n`;
    statusMsg += `└ *Support:* 24/7\n`;
    
    reply(statusMsg);
});

// ── GET SETTINGS ──────────────────────────────
cmd({
    pattern: 'getsettings',
    alias: ['settings', 'config'],
    desc: 'View all bot settings',
    category: 'settings',
    react: '⚙️',
    filename: __filename
},
async (conn, mek, m, { isOwner, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');
    
    const allSettings = getAllSettings();
    const premiumCount = Object.keys(allSettings.premiumUsers || {}).length;
    
    let settingsMsg = `⚙️ *BOT SETTINGS* ⚙️\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    settingsMsg += `🔐 *Mode:* ${allSettings.mode || 'public'}\n`;
    settingsMsg += `💎 *Premium Users:* ${premiumCount}\n`;
    settingsMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    settingsMsg += `*Other Settings:*\n`;
    
    Object.entries(allSettings).forEach(([key, value]) => {
        if (key !== 'premiumUsers' && key !== 'mode') {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
            settingsMsg += `├ ${key}: ${displayValue}\n`;
        }
    });
    
    reply(settingsMsg);
});

// ── BAN USER ──────────────────────────────────
cmd({
    pattern: 'pban',
    alias: ['block'],
    desc: 'Ban a user from using the bot',
    category: 'settings',
    react: '🔨',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, quoted }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let number = q ? q.replace(/[^0-9]/g, '') :
                 quoted ? quoted.sender.split('@')[0] : null;

    if (!number) return reply('📝 *Usage:* .ban 94712345678\n\nOr reply to a user message.');

    const jid = number + '@s.whatsapp.net';
    let bannedUsers = getSetting('bannedUsers') || [];
    
    if (bannedUsers.includes(jid)) {
        return reply(`⚠️ *@${number} is already banned!*`);
    }
    
    bannedUsers.push(jid);
    setSetting('bannedUsers', bannedUsers);
    
    reply(`✅ *@${number} has been banned from using the bot!* 🔨`);
    
    try {
        await conn.sendMessage(jid, {
            text: `⚠️ *You have been BANNED* ⚠️\n\nYou are no longer allowed to use SHAVIYA-XMD V2 Bot.\n\nReason: Violation of bot rules.\n\nContact owner for appeal.`
        });
    } catch(e) {}
});

// ── UNBAN USER ────────────────────────────────
cmd({
    pattern: 'punban',
    alias: ['unblock'],
    desc: 'Unban a user',
    category: 'settings',
    react: '🔓',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, quoted }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    let number = q ? q.replace(/[^0-9]/g, '') :
                 quoted ? quoted.sender.split('@')[0] : null;

    if (!number) return reply('📝 *Usage:* .unban 94712345678\n\nOr reply to a user message.');

    const jid = number + '@s.whatsapp.net';
    let bannedUsers = getSetting('bannedUsers') || [];
    
    if (!bannedUsers.includes(jid)) {
        return reply(`⚠️ *@${number} is not banned!*`);
    }
    
    bannedUsers = bannedUsers.filter(user => user !== jid);
    setSetting('bannedUsers', bannedUsers);
    
    reply(`✅ *@${number} has been unbanned!* 🔓`);
    
    try {
        await conn.sendMessage(jid, {
            text: `✅ *You have been UNBANNED* ✅\n\nYou can now use SHAVIYA-XMD V2 Bot again.\n\nPlease follow the rules.`
        });
    } catch(e) {}
});

// ── BANNED LIST ───────────────────────────────
cmd({
    pattern: 'bannedlist',
    alias: ['banlist', 'bans'],
    desc: 'List all banned users',
    category: 'settings',
    react: '📋',
    filename: __filename
},
async (conn, mek, m, { isOwner, reply, from }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');
    
    const bannedUsers = getSetting('bannedUsers') || [];
    
    if (bannedUsers.length === 0) {
        return reply('🔓 *No banned users found.*');
    }
    
    let list = `🔨 *BANNED USERS* 🔨\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    bannedUsers.forEach((jid, i) => {
        list += `${i + 1}. @${jid.split('@')[0]}\n`;
    });
    
    await conn.sendMessage(from, {
        text: list,
        mentions: bannedUsers
    }, { quoted: mek });
});

// Export functions for use in other plugins
module.exports = {
    getSetting,
    setSetting,
    isPremium,
    isOwner,
    hasCommandAccess,
    isBanned
};
