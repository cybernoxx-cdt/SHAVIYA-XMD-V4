const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ═══════════════════════════════════════════════════
//  Session Config Helpers
// ═══════════════════════════════════════════════════
function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, `../data/session_config_${sessionId}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

// ═══════════════════════════════════════════════════
//  React helper
// ═══════════════════════════════════════════════════
async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
// ═══════════════════════════════════════════════════
async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;
  const fallbackUrl = hardThumbUrl;

  async function fetchThumb(url) {
    const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
  }

  try {
    return await fetchThumb(primaryUrl);
  } catch (e) {
    if (primaryUrl !== fallbackUrl) {
      try { return await fetchThumb(fallbackUrl); } catch {}
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
//  Wait for reply
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, replyToId, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text;
      if (msg.key.remoteJid === from && ctx?.stanzaId === replyToId) {
        conn.ev.off("messages.upsert", handler);
        resolve({ msg, text });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => {
      conn.ev.off("messages.upsert", handler);
      reject(new Error("Timeout"));
    }, timeout);
  });
}

// ═══════════════════════════════════════════════════
//  UsersDrive Direct Link — Puppeteer
//  JS render කරලා download button click කරනවා
//  direct CDN link intercept කරනවා
// ═══════════════════════════════════════════════════
async function getUsersDriveLink(pageUrl) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // intercept requests — direct mp4/cdn link catch කරනවා
    let directUrl = null;

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      // usersdrive CDN / direct file links
      if (
        (url.includes(".mp4") || url.includes("/dl/") || url.includes("/download/") || url.includes("cdn")) &&
        !url.includes("usersdrive.com/img") &&
        !url.includes("analytics") &&
        !url.includes(".js") &&
        !url.includes(".css")
      ) {
        directUrl = url;
        console.log("🎯 Intercepted:", url);
      }
      req.continue();
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );

    // Page load
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Method 1: "Slow Download" / "Download" button click
    try {
      await page.waitForSelector('a[href*="dl"], a.btn, form#F1 input[type=submit], input[name="method_free"]', { timeout: 8000 });

      // slow download button
      const slowBtn = await page.$('input[name="method_free"], input[value*="Download"], a.btn-download, a[href*="download"]');
      if (slowBtn) {
        await slowBtn.click();
        await page.waitForTimeout(4000);
      }
    } catch {}

    // Method 2: countdown link
    try {
      await page.waitForSelector('a#uniqueExpiryLink, a.btn.btn-primary, a[id*="download"]', { timeout: 6000 });
      const dlBtn = await page.$('a#uniqueExpiryLink, a.btn.btn-primary, a[id*="download"]');
      if (dlBtn) {
        const href = await page.evaluate(el => el.href, dlBtn);
        if (href && href.startsWith("http") && !href.includes("usersdrive.com/index")) {
          directUrl = href;
        }
      }
    } catch {}

    // Method 3: page HTML scan for direct urls
    if (!directUrl) {
      const content = await page.content();
      const match =
        content.match(/https:\/\/[a-z0-9\-]+\.usersdrive\.com\/[^\s"'<>]+\.mp4[^\s"'<>]*/i) ||
        content.match(/"(https:\/\/[^\s"'<>]+(?:dl|download|cdn)[^\s"'<>]*\.mp4[^\s"'<>]*)"/i) ||
        content.match(/file:\s*"(https:\/\/[^"]+)"/i);
      if (match) directUrl = match[1] || match[0];
    }

    await browser.close();
    browser = null;

    if (!directUrl) throw new Error("No direct link found");
    return directUrl;

  } catch (e) {
    if (browser) await browser.close();
    throw e;
  }
}

// ═══════════════════════════════════════════════════
//  PLK COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "piratelk",
  desc: "PirateLK Auto Download (UsersDrive + Puppeteer)",
  category: "downloader",
  react: "🔍",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, sessionId }) => {
  try {
    if (!q) return reply("❗ Example: .plk Avatar");

    const FOOTER     = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb  = getHardThumbUrl(sessionId);
    const movieDocOn = isMovieDocOn(sessionId);

    await react(conn, from, m.key, "🔍");

    // 1️⃣ Search
    const searchRes = await axios.get(
      `https://piratelk.vercel.app/api/search?q=${encodeURIComponent(q)}`
    );
    const results = searchRes.data?.results;
    if (!results?.length) return reply("❌ No results");

    let listText = "🎬 *PirateLK Results*\n\n";
    results.slice(0, 10).forEach((v, i) => { listText += `*${i + 1}.* ${v.title}\n`; });

    const listMsg = await conn.sendMessage(from, {
      text: listText + `\nReply number\n\n${FOOTER}`
    }, { quoted: mek });

    // 2️⃣ Select movie
    const { msg: movieMsg, text: movieText } = await waitForReply(conn, from, listMsg.key.id);
    const index = parseInt(movieText) - 1;
    if (!results[index]) return reply("❌ Invalid number");
    await react(conn, from, movieMsg.key, "🎬");

    // 3️⃣ Details
    const infoRes = await axios.get(
      `https://piratelk.vercel.app/api/details?url=${encodeURIComponent(results[index].link)}`
    );
    const data = infoRes.data?.data;
    if (!data) return reply("❌ Failed to get details");

    // UsersDrive links only
    const dLinks = data.downloadLinks.filter(l =>
      l.url && l.url.includes("usersdrive.com")
    );
    if (!dLinks.length) return reply("❌ UsersDrive links හමු නොවීය.");

    let infoText = `🎬 *${data.title}*\n\n*Available Qualities:*\n`;
    dLinks.forEach((d, i) => {
      infoText += `*${i + 1}.* ${d.label.split('\t')[0].trim()}\n`;
    });

    const infoMsg = await conn.sendMessage(from, {
      image: { url: movieDocOn ? (data.thumbnail || hardThumb) : hardThumb },
      caption: infoText + `\nReply number\n\n${FOOTER}`
    }, { quoted: movieMsg });

    // 4️⃣ Select quality
    const { msg: dlMsg, text: dlText } = await waitForReply(conn, from, infoMsg.key.id);
    const dIndex = parseInt(dlText) - 1;
    if (!dLinks[dIndex]) return reply("❌ Invalid number");

    await react(conn, from, dlMsg.key, "⬇️");
    const selectedLink = dLinks[dIndex];

    await conn.sendMessage(from, { text: "⏳ UsersDrive link resolve කරනවා..." }, { quoted: dlMsg });

    // 5️⃣ Direct link resolve — Method 1: API, Method 2: Puppeteer
    let finalUrl = null;
    let fileSize = "";

    // API try
    try {
      const api = await axios.get(
        `https://api-dark-shan-yt.koyeb.app/download/userdrive`,
        { params: { url: selectedLink.url, apikey: "09acaa863782cc46" }, timeout: 30000 }
      );
      if (api.data?.status && api.data?.data?.download) {
        finalUrl = api.data.data.download;
        fileSize = api.data.data.size || "";
        console.log("✅ API method OK");
      }
    } catch (e) {
      console.log("⚠️ API failed:", e.message);
    }

    // Puppeteer try
    if (!finalUrl) {
      try {
        console.log("🤖 Trying Puppeteer...");
        finalUrl = await getUsersDriveLink(selectedLink.url);
        console.log("✅ Puppeteer OK:", finalUrl);
      } catch (e) {
        console.log("⚠️ Puppeteer failed:", e.message);
      }
    }

    // 6️⃣ Send
    const thumb = await makeThumbnail(data.thumbnail || null, hardThumb, movieDocOn);
    const qualityLabel = selectedLink.label.split('\t')[0].trim();

    if (finalUrl) {
      const docMsg = await conn.sendMessage(from, {
        document: { url: finalUrl },
        fileName: `${data.title} (${qualityLabel}).mp4`.replace(/[\/\\:*?"<>|]/g, ""),
        mimetype: "video/mp4",
        jpegThumbnail: thumb || undefined,
        caption: `🎬 *${data.title}*\n💎 *Quality:* ${qualityLabel}${fileSize ? `\n⚖️ *Size:* ${fileSize}` : ""}\n\n${FOOTER}`
      }, { quoted: dlMsg });

      await react(conn, from, docMsg.key, "✅");
    } else {
      await react(conn, from, dlMsg.key, "❌");
      reply(`❌ Direct link resolve failed.\n\nManually:\n${selectedLink.url}`);
    }

  } catch (err) {
    console.log("🔥 ERROR:", err);
    reply("⚠️ Error: " + err.message);
  }
});
