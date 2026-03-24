const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os');

const MENU_TIMEOUT = config.MENU_TIMEOUT || 10 * 60 * 1000;

const secretvCard = {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA-XMD V4",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

cmd({
    pattern: "menu",
    alias: ["getmenu", "list", "help", "cmds", "allmenu"],
    desc: "Show full interactive bot menu",
    category: "main",
    react: "📂",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    try {
        const totalCommands = commands.length;
        const uptime = runtime(process.uptime());
        const ram = `${(process.memoryUsage().heapUsed/1024/1024).toFixed(2)}MB`;

        const info = `╭━━━〔 🎀 *SHAVIYA-XMD V4* 〕━━━⬣
┃
┃ 👋 *Hello* ${pushname}!
┃
┃ 🤖 *Bot*      : ${config.BOT_NAME}
┃ 🌀 *Version*  : ${config.BOT_VERSION}
┃ 👤 *User*     : ${pushname}
┃ ⏰ *Uptime*   : ${uptime}
┃ 🧠 *RAM*      : ${ram}
┃ 🔢 *Commands* : ${totalCommands}
┃ 🖊️ *Prefix*   : ${config.PREFIX}
┃
┃ ━━━「 📂 CATEGORIES 」━━━
┃
┃ *1️⃣*  🤵‍♂  Owner Menu
┃ *2️⃣*  🤖  AI Menu
┃ *3️⃣*  🔍  Search Menu
┃ *4️⃣*  📥  Download Menu
┃ *5️⃣*  😁  Fun Menu
┃ *6️⃣*  📂  Main Menu
┃ *7️⃣*  🔄  Convert Menu
┃ *8️⃣*  📌  Other Menu
┃ *9️⃣*  🎨  Logo Menu
┃ *🔟*  🖼️  Imagine Menu
┃ *1️⃣1️⃣* 👥  Group Menu
┃ *1️⃣2️⃣* ⚙️  Setting Menu
┃ *1️⃣3️⃣* 🎬  Movie Menu
┃ *1️⃣4️⃣* 📰  News Menu
┃ *1️⃣5️⃣* 🎵  Music Menu
┃
┃ ⏰ *Reply expires in 10 minutes*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: config.MENU_IMG },
            caption: info
        }, { quoted: secretvCard });

        const messageID = sentMsg.key.id;
        const menuImage = config.MENU_IMG;

        // Register one-time listener with timeout
        let expired = false;
        const timeoutHandle = setTimeout(() => { expired = true; }, MENU_TIMEOUT);

        const handler = async (msgUpdate) => {
            if (expired) return conn.ev.off('messages.upsert', handler);
            try {
                const mekInfo = msgUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const fromUser = mekInfo.key.remoteJid;
                const textMsg  = mekInfo.message.conversation || mekInfo.message.extendedTextMessage?.text;
                const quotedId = mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId;

                if (quotedId !== messageID) return;
                if (fromUser !== from) return;

                const userReply = textMsg?.trim();
                if (!/^(1[0-5]|[1-9])$/.test(userReply)) {
                    return conn.sendMessage(fromUser, { text: "❌ *1-15 අතරෙ අංකයක් reply කරන්න!*" }, { quoted: mekInfo });
                }

                await conn.sendMessage(fromUser, { react: { text: '🎡', key: mekInfo.key } });

                let captionText = "";
                switch (userReply) {
                    case "1":
                        captionText = `╭━━━〔 *🤵‍♂ OWNER MENU* 〕━━━⬣
┃ ⚠️ *Owner Only*
┃ • .owner       — Owner contact
┃ • .shutdown    — Shutdown bot
┃ • .restart     — Restart bot
┃ • .broadcast   — Message all groups
┃ • .setpp       — Set bot profile pic
┃ • .clearchats  — Clear all chats
┃ • .gjid        — List group JIDs
┃ • .block       — Block user
┃ • .unblock     — Unblock user
┃ • .update      — Update bot
┃ • .mode        — Change bot mode
┃ • .setprefix   — Change prefix
┃ • .ping        — Bot speed test
┃ • .alive       — Bot status
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "2":
                        captionText = `╭━━━〔 *🤖 AI MENU* 〕━━━⬣
┃ • .ai          — AI chat (auto)
┃ • .gpt         — ChatGPT
┃ • .gemini      — Google Gemini
┃ • .gemini2     — Gemini Pro
┃ • .deepseek    — DeepSeek AI
┃ • .copilot     — AI Copilot
┃ • .imagine     — AI Image Gen
┃ • .deepsearch  — Deep web search
┃ • .report      — Research report
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "3":
                        captionText = `╭━━━〔 *🔍 SEARCH MENU* 〕━━━⬣
┃ • .google      — Google search
┃ • .deepsearch  — Deep search
┃ • .report      — Research report
┃ • .npm         — NPM package search
┃ • .git         — GitHub search
┃ • .gitstalk    — GitHub user stalk
┃ • .apk         — APK search
┃ • .news        — Latest news
┃ • .news2       — Derana news
┃ • .biscopes    — Biscopes search
┃ • .getdp       — Get profile pic
┃ • .getdpnub    — Get DP by number
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "4":
                        captionText = `╭━━━〔 *📥 DOWNLOAD MENU* 〕━━━⬣
┃ 🎬 *Movie*
┃ • .movie       — All-in-one movie engine
┃ • .sinhalasub  — Sinhalasub
┃ • .cinesubz    — Cinesubz
┃ • .dinka       — Dinka Sinhalasub
┃ • .anime       — SL Anime Club
┃ • .pirate      — Pirate.lk
┃ • .moviesub    — Moviesublk
┃ • .lakvision   — Lakvision
┃ • .cinetv      — CineTV
┃ • .cinegroup   — Cine Group
┃
┃ 🎵 *Audio/Video*
┃ • .ytmp3       — YouTube audio
┃ • .ytmp4       — YouTube video
┃ • .tiktok      — TikTok download
┃ • .fb          — Facebook video
┃ • .ig          — Instagram media
┃ • .twitter     — Twitter/X video
┃ • .pinterest   — Pinterest media
┃ • .gdrive      — Google Drive dl
┃ • .mega        — MEGA download
┃
┃ 🖼️ *Media*
┃ • .img         — Image download
┃ • .gif         — GIF search/dl
┃ • .ringtone    — Ringtone search
┃ • .lyrics      — Song lyrics
┃ • .csong       — Sinhala song
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "5":
                        captionText = `╭━━━〔 *😁 FUN MENU* 〕━━━⬣
┃ • .ship        — Love ship %
┃ • .match       — Match %
┃ • .truth       — Truth question
┃ • .dare        — Dare challenge
┃ • .joke        — Random joke
┃ • .riddle      — Riddle
┃ • .quote       — Motivational quote
┃ • .fact        — Random fact
┃ • .meme        — Random meme
┃ • .waifu       — Anime waifu pic
┃ • .neko        — Anime neko pic
┃ • .pp          — Random anime pic
┃ • .slap        — Slap GIF
┃ • .hug         — Hug GIF
┃ • .kiss        — Kiss GIF
┃ • .punch       — Punch GIF
┃ • .shoot       — Shoot GIF
┃ • .kill        — Kill GIF
┃ • .fuck        — Adult GIF
┃ • .emix        — Emoji mix
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "6":
                        captionText = `╭━━━〔 *📂 MAIN MENU* 〕━━━⬣
┃ • .menu        — Main menu
┃ • .ping        — Bot speed
┃ • .alive       — Bot status
┃ • .owner       — Owner info
┃ • .pair        — Pair device
┃ • .jid         — Get JID
┃ • .listcmd     — All commands
┃ • .runtime     — Uptime
┃ • .version     — Bot version
┃ • .help        — Help
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "7":
                        captionText = `╭━━━〔 *🔄 CONVERT MENU* 〕━━━⬣
┃ • .sticker     — Image to sticker
┃ • .toimg       — Sticker to image
┃ • .tovideo     — Sticker to video
┃ • .toaudio     — Video to audio
┃ • .tomp3       — Convert to MP3
┃ • .tomp4       — Convert to MP4
┃ • .togif       — Video to GIF
┃ • .compress    — Compress media
┃ • .translate   — Translate text
┃ • .fancy       — Fancy text fonts
┃ • .tts         — Text to speech
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "8":
                        captionText = `╭━━━〔 *📌 OTHER MENU* 〕━━━⬣
┃ • .weather     — Weather info
┃ • .calc        — Calculator
┃ • .qr          — Generate QR
┃ • .readqr      — Read QR code
┃ • .shorturl    — Shorten URL
┃ • .whois       — WHOIS lookup
┃ • .ip          — IP lookup
┃ • .currency    — Currency convert
┃ • .time        — World time
┃ • .fakecall    — Fake call
┃ • .forward     — Forward msgs
┃ • .scan        — Online scan
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "9":
                        captionText = `╭━━━〔 *🎨 LOGO MENU* 〕━━━⬣
┃ • .logo1       — Logo style 1
┃ • .logo2       — Logo style 2
┃ • .logo3       — Logo style 3
┃ • .logo4       — Logo style 4
┃ • .logo5       — Logo style 5
┃ • .logo6       — Logo style 6
┃ • .logo7       — Logo style 7
┃ • .logo8       — Logo style 8
┃ • .logo9       — Logo style 9
┃ • .logo10      — Logo style 10
┃ • .logo11      — Logo style 11
┃ • .logo12      — Logo style 12
┃ • .ttlogo      — Text to logo
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "10":
                        captionText = `╭━━━〔 *🖼️ IMAGINE MENU* 〕━━━⬣
┃ • .imagine     — Generate AI image
┃ • .waifu       — Anime waifu
┃ • .neko        — Anime neko
┃ • .getimg      — Get image by query
┃ • .getvideo    — Get video by query
┃ • .getvoice    — Get voice/audio
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "11":
                        captionText = `╭━━━〔 *👥 GROUP MENU* 〕━━━⬣
┃ ⚙️ *Admin Only*
┃ • .kick        — Kick member
┃ • .add         — Add member
┃ • .promote     — Promote admin
┃ • .demote      — Demote admin
┃ • .mute        — Mute group
┃ • .unmute      — Unmute group
┃ • .lock        — Lock group
┃ • .unlock      — Unlock group
┃ • .gname       — Change group name
┃ • .gdesc       — Change group desc
┃ • .glink       — Get group link
┃ • .resetlink   — Reset invite link
┃ • .tagall      — Tag all members
┃ • .tag         — Tag specific
┃ • .poll        — Create poll
┃ • .groupinfo   — Group info
┃ • .groupid     — Group ID
┃ • .groupout    — Leave group
┃ • .acceptall   — Accept all requests
┃ • .joingc      — Join by link
┃ • .newgc       — Create new group
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "12":
                        captionText = `╭━━━〔 *⚙️ SETTING MENU* 〕━━━⬣
┃ • .mode public/private/inbox/groups
┃ • .setprefix   — Change prefix
┃ • .antidelete on/off
┃ • .antilink on/off
┃ • .antibad on/off
┃ • .antibot on/off
┃ • .anticall on/off
┃ • .auto-voice on/off
┃ • .auto-typing on/off
┃ • .auto-recording on/off
┃ • .always-online on/off
┃ • .auto-read on/off
┃ • .auto-react on/off
┃ • .auto-reply on/off
┃ • .auto-sticker on/off
┃ • .status-react on/off
┃ • .welcome on/off
┃ • .kicklink on/off
┃ • .heartreact on/off
┃ • .envsetting  — All env settings
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "13":
                        captionText = `╭━━━〔 *🎬 MOVIE MENU* 〕━━━⬣
┃ • .movie       — All-in-one engine
┃                  (reply 1-9 to select source)
┃
┃ ➊  Sinhalasub
┃ ➋  Cinesubz
┃ ➌  Dinka Sinhalasub
┃ ➍  SL Anime Club
┃ ➎  Pirate.lk
┃ ➏  Moviesublk
┃ ➐  Lakvision
┃ ➑  CineTV
┃ ➒  Cine Group
┃
┃ 🎬 *Direct Commands*
┃ • .sinhalasub  <film>
┃ • .cinesubz    <film>
┃ • .dinka       <film>
┃ • .anime       <film>
┃ • .pirate      <film>
┃ • .lakvision   <film>
┃ • .cinetv      <film>
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "14":
                        captionText = `╭━━━〔 *📰 NEWS MENU* 〕━━━⬣
┃ • .news        — Latest news
┃ • .news2       — Derana news
┃ • .newslk      — Sri Lanka news
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;

                    case "15":
                        captionText = `╭━━━〔 *🎵 MUSIC MENU* 〕━━━⬣
┃ • .play        — Play song (audio)
┃ • .video       — Play song (video)
┃ • .lyrics      — Song lyrics
┃ • .csong       — Sinhala songs
┃ • .ringtone    — Ringtones
┃ • .ytmp3       — YouTube MP3
┃ • .ytmp4       — YouTube MP4
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`; break;
                }

                await conn.sendMessage(fromUser, {
                    image: { url: menuImage },
                    caption: captionText
                }, { quoted: mekInfo });

            } catch (err) {
                console.error("Menu handler error:", err.message);
            }
        };

        conn.ev.on('messages.upsert', handler);

        // Auto-remove listener after timeout
        setTimeout(() => {
            conn.ev.off('messages.upsert', handler);
        }, MENU_TIMEOUT);

    } catch (error) {
        console.error("Menu error:", error);
        reply(`❌ *Menu error:* ${error.message}`);
    }
});
