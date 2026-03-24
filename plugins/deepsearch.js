const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

// WhatsApp secret code style vCard
const secretvCard = {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "status@broadcast" },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA-XMD V4",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:SHAVIYA-XMD V4\nORG:SHAVIYA TECH;\nTEL;type=CELL;type=VOICE;waid=94707085822:+94707085822\nEND:VCARD`
        }
    }
};

// ─── DeepSearch (DuckDuckGo no-API) ───────────────────────────────
cmd({
    pattern: "deepsearch",
    alias: ["ds", "websearch", "search2", "deepsrch"],
    desc: "🔍 Deep web search with detailed results & report",
    category: "search",
    react: "🔍",
    use: ".deepsearch <query>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ Usage: .deepsearch <query>\nExample: .deepsearch best WhatsApp bots 2025");

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
        const waitMsg = await conn.sendMessage(from, { text: `🔍 *Searching...*\n\n📝 Query: *${q}*\n⏳ Please wait...` }, { quoted: mek });

        // Use DuckDuckGo Instant Answer API
        let results = [];
        let abstractText = '';
        let abstractSource = '';
        let relatedTopics = [];

        try {
            const ddgRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, {
                timeout: 10000,
                headers: { 'User-Agent': 'SHAVIYA-XMD-Bot/4.0' }
            });
            const ddg = ddgRes.data;
            abstractText   = ddg.AbstractText  || '';
            abstractSource = ddg.AbstractSource || '';
            relatedTopics  = (ddg.RelatedTopics || []).slice(0, 5).map(t => t.Text).filter(Boolean);
        } catch (e) { /* fallback */ }

        // Fallback: Wikipedia summary
        let wikiText = '';
        if (!abstractText) {
            try {
                const wikiRes = await axios.get(
                    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.split(' ').slice(0,3).join('_'))}`,
                    { timeout: 8000 }
                );
                wikiText = wikiRes.data.extract || '';
                if (wikiText.length > 600) wikiText = wikiText.substring(0, 600) + '...';
            } catch (e) { /* ignore */ }
        }

        const mainText = abstractText || wikiText || '❌ No direct answer found. Try a more specific query.';

        // Format report
        const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
        let report = `╭━━━〔 🔍 *DEEP SEARCH REPORT* 〕━━━⬣
┃
┃ 📝 *Query*  : ${q}
┃ 🕐 *Time*   : ${now}
┃ 🌐 *Source* : ${abstractSource || 'Wikipedia / Web'}
┃
┃ ━━━「 📖 SUMMARY 」━━━
┃
${mainText.split('\n').map(l => `┃ ${l}`).join('\n')}
┃`;

        if (relatedTopics.length > 0) {
            report += `\n┃ ━━━「 🔗 RELATED 」━━━\n`;
            relatedTopics.forEach((t, i) => {
                const short = t.length > 100 ? t.substring(0, 100) + '...' : t;
                report += `┃ ${i+1}. ${short}\n`;
            });
        }

        report += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`;

        await conn.sendMessage(from, {
            text: report,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: 'shavi&newsletter',
                    newsletterName: 'SHAVIYA-XMD V4',
                    serverMessageId: 143
                }
            }
        }, { quoted: secretvCard });

    } catch (e) {
        console.error("DeepSearch error:", e);
        reply(`❌ Search error: ${e.message}`);
    }
});

// ─── Report Generator ──────────────────────────────────────────────
cmd({
    pattern: "report",
    alias: ["genreport", "makereport", "reportgen"],
    desc: "📊 Generate a detailed research report on any topic",
    category: "search",
    react: "📊",
    use: ".report <topic>",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return reply("❗ Usage: .report <topic>\nExample: .report Sri Lanka economy 2025");

        await conn.sendMessage(from, { react: { text: '📊', key: mek.key } });
        await conn.sendMessage(from, { text: `📊 *Generating Report...*\n\n📝 Topic: *${q}*\n⏳ Fetching data...` }, { quoted: mek });

        let sections = [];

        // 1. Wikipedia summary
        try {
            const wikiRes = await axios.get(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.split(' ').slice(0,3).join('_'))}`,
                { timeout: 10000 }
            );
            const d = wikiRes.data;
            if (d.extract) {
                sections.push({ title: '📖 Overview', content: d.extract.length > 800 ? d.extract.substring(0,800)+'...' : d.extract });
            }
        } catch (e) {}

        // 2. DuckDuckGo related
        try {
            const ddgRes = await axios.get(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`,
                { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }
            );
            const ddg = ddgRes.data;
            if (ddg.AbstractText) sections.push({ title: '🔍 Key Information', content: ddg.AbstractText });
            const related = (ddg.RelatedTopics || []).slice(0,4).map(t => t.Text).filter(Boolean);
            if (related.length) sections.push({ title: '🔗 Related Topics', content: related.map((t,i) => `${i+1}. ${t}`).join('\n') });
        } catch (e) {}

        const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
        let report = `╭━━━〔 📊 *RESEARCH REPORT* 〕━━━⬣
┃
┃ 📝 *Topic*    : ${q}
┃ 📅 *Generated*: ${now}
┃ 🤖 *Bot*      : SHAVIYA-XMD V4
┃
`;

        if (sections.length === 0) {
            report += `┃ ❌ Not enough data found for this topic.\n┃ Try a more specific or different query.\n`;
        } else {
            for (const sec of sections) {
                report += `┃ ━━━「 ${sec.title} 」━━━\n`;
                sec.content.split('\n').forEach(l => { report += `┃ ${l}\n`; });
                report += `┃\n`;
            }
        }

        report += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 💎*`;

        await conn.sendMessage(from, {
            text: report,
            contextInfo: {
                forwardingScore: 999, isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: 'shavi&newsletter',
                    newsletterName: 'SHAVIYA-XMD V4',
                    serverMessageId: 143
                }
            }
        }, { quoted: secretvCard });

    } catch (e) {
        console.error("Report error:", e);
        reply(`❌ Report error: ${e.message}`);
    }
});
