const { cmd } = require('../command');

// ═══════════════════════════════════════════════════
//  .button on/off
//  ON  → interactive buttons use කරනවා
//  OFF → plain text + number reply system use කරනවා
//        (bot එකේ සියලුම sendButton calls affect වෙනවා)
// ═══════════════════════════════════════════════════
cmd({
  pattern:  'btntoggle',
  alias:    ['btnmode'],
  desc:     'Bot buttons globally on/off කිරීම',
  category: 'owner',
  react:    '🔘',
  filename: __filename
}, async (conn, mek, m, { from, args, isOwner, reply, sessionId }) => {

  if (!isOwner) return reply('❌ Owner ට විතරයි.');

  const subCmd = args[0]?.toLowerCase();
  const current = global.isButtonEnabled(sessionId);

  // Status show
  if (!subCmd || (subCmd !== 'on' && subCmd !== 'off')) {
    return reply(
`🔘 *Button Mode Status*

🖥️ *Session:* ${sessionId}
📌 *Status:* ${current ? '✅ ON (Buttons)' : '❌ OFF (Number Reply)'}

Usage:
• *.button on*  → Interactive buttons enable
• *.button off* → Number reply system use කරනවා`
    );
  }

  if (subCmd === 'on') {
    global.setButtonState(sessionId, true);
    return reply(
`✅ *Button Mode ON!*

දැන් bot buttons use කරනවා.
Interactive buttons WhatsApp හි show වෙනවා.`
    );
  }

  if (subCmd === 'off') {
    global.setButtonState(sessionId, false);
    return reply(
`❌ *Button Mode OFF!*

දැන් number reply system use කරනවා.
Buttons වෙනුවට numbered list show වෙනවා.

_Example:_
*1.* Option One
*2.* Option Two
_Reply with number_`
    );
  }
});
