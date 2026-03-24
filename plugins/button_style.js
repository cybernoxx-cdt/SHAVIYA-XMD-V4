// ============================================
//   plugins/button_style.js - SHAVIYA-XMD V2
//   Button Style Settings Plugin
//   Commands:
//     .buttonstyle          → show current style
//     .buttonstyle list     → list available styles
//     .buttonstyle <name>   → set style
//     .button on/off        → enable/disable buttons globally
// ============================================

const { cmd } = require('../command');
const { getSetting, setSetting } = require('../lib/settings');

// ── Available button styles ───────────────────────────────
const BUTTON_STYLES = {
    default: {
        name: 'Default',
        emoji: '🔘',
        desc: 'Standard WhatsApp interactive buttons',
        headerType: 1, // text header
        footerEnabled: true,
    },
    image: {
        name: 'Image Header',
        emoji: '🖼️',
        desc: 'Buttons with image header (thumbnail shown)',
        headerType: 4, // image header
        footerEnabled: true,
    },
    video: {
        name: 'Video Header',
        emoji: '🎬',
        desc: 'Buttons with video header',
        headerType: 3, // video header
        footerEnabled: true,
    },
    minimal: {
        name: 'Minimal',
        emoji: '⚡',
        desc: 'No header, no footer — clean button list only',
        headerType: 0,
        footerEnabled: false,
    },
    numbered: {
        name: 'Numbered List',
        emoji: '🔢',
        desc: 'Uses numbered list (text reply) instead of buttons',
        headerType: 1,
        footerEnabled: true,
        forceNumbered: true,
    },
};

// ── Helper ────────────────────────────────────────────────
function getCurrentStyle() {
    return getSetting('buttonStyle') || 'default';
}

// ── Expose style to global for use in sendInteractiveButtons ─
global.getButtonStyle = function() {
    const key = getCurrentStyle();
    return BUTTON_STYLES[key] || BUTTON_STYLES['default'];
};

// ── .buttonstyle command ──────────────────────────────────
cmd({
    pattern:  'buttonstyle',
    alias:    ['btnstyle', 'setstyle'],
    desc:     'Set the button display style for the bot',
    category: 'settings',
    react:    '🎨',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const sub = (q || '').toLowerCase().trim();

    // List styles
    if (sub === 'list' || sub === 'styles') {
        const styleList = Object.entries(BUTTON_STYLES)
            .map(([key, s]) => `${s.emoji} *${key}* — ${s.desc}`)
            .join('\n');
        const current = getCurrentStyle();
        return reply(
`🎨 *Available Button Styles*

${styleList}

📌 *Current style:* \`${current}\`

Usage: *.buttonstyle <name>*
Example: *.buttonstyle image*`
        );
    }

    // Show current status
    if (!sub) {
        const current = getCurrentStyle();
        const style   = BUTTON_STYLES[current] || BUTTON_STYLES['default'];
        const btnOn   = getSetting('button') ?? false;
        return reply(
`🎨 *Button Style Settings*

📌 *Current Style:* ${style.emoji} ${style.name} (\`${current}\`)
📝 *Description:* ${style.desc}
🔘 *Button Mode:* ${btnOn ? '✅ ON' : '❌ OFF'}

Commands:
• *.buttonstyle list*     → See all styles
• *.buttonstyle <name>*   → Change style
• *.button on/off*        → Toggle buttons globally`
        );
    }

    // Set style
    if (BUTTON_STYLES[sub]) {
        setSetting('buttonStyle', sub);
        const style = BUTTON_STYLES[sub];
        return reply(
`✅ *Button style changed!*

${style.emoji} *Style:* ${style.name}
📝 ${style.desc}

All bot buttons will now use this style.`
        );
    }

    // Unknown style
    const styleKeys = Object.keys(BUTTON_STYLES).join(', ');
    return reply(`❌ *Unknown style:* \`${sub}\`\n\nAvailable: ${styleKeys}\n\nUse *.buttonstyle list* to see details.`);
});

// ── .button on/off command ────────────────────────────────
cmd({
    pattern:  'button',
    alias:    ['btnmode', 'buttons'],
    desc:     'Enable or disable interactive buttons globally',
    category: 'settings',
    react:    '🔘',
    filename: __filename
},
async (conn, mek, m, { isOwner, q, reply, sessionId }) => {
    if (!isOwner) return reply('❌ *Owner only command!*');

    const sub = (q || '').toLowerCase().trim();

    // Status
    if (!sub || (sub !== 'on' && sub !== 'off')) {
        const current    = getSetting('button') ?? false;
        const styleName  = getCurrentStyle();
        const style      = BUTTON_STYLES[styleName] || BUTTON_STYLES['default'];
        return reply(
`🔘 *Button Mode Status*

📌 *Status:* ${current ? '✅ ON (Buttons Active)' : '❌ OFF (Number Reply)'}
🎨 *Style:* ${style.emoji} ${style.name}

Usage:
• *.button on*  → Enable interactive buttons
• *.button off* → Use number reply system instead`
        );
    }

    if (sub === 'on') {
        setSetting('button', true);
        // Also sync global session state if available
        if (typeof global.setButtonState === 'function' && sessionId) {
            global.setButtonState(sessionId, true);
        }
        return reply(
`✅ *Button Mode ON!*

🔘 Bot will now use interactive buttons.
🎨 Style: ${BUTTON_STYLES[getCurrentStyle()]?.name || 'Default'}

Use *.buttonstyle* to change the button style.`
        );
    }

    if (sub === 'off') {
        setSetting('button', false);
        if (typeof global.setButtonState === 'function' && sessionId) {
            global.setButtonState(sessionId, false);
        }
        return reply(
`❌ *Button Mode OFF!*

🔢 Bot will now use numbered reply system.

_Example:_
*1.* Option One
*2.* Option Two
_Reply with the number_`
        );
    }
});
