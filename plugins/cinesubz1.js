const { cmd } = require('../command');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function getSessionConfig(sessionId) {
  try {
    const file = path.join(__dirname, '../data/session_config_' + sessionId + '.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return {};
}

function saveSessionConfig(sessionId, config) {
  try {
    const dataFolder = path.join(__dirname, '../data');
    if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
    const file = path.join(dataFolder, 'session_config_' + sessionId + '.json');
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  } catch (e) {}
}

function getBotName(sessionId) {
  return getSessionConfig(sessionId).botName || "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 © 𝟐𝟎𝟐𝟔 🇱🇰";
}

function getHardThumbUrl(sessionId) {
  return getSessionConfig(sessionId).thumbUrl ||
    "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";
}

function isMovieDocOn(sessionId) {
  return getSessionConfig(sessionId).movieDoc === true;
}

async function react(conn, jid, key, emoji) {
  try { await conn.sendMessage(jid, { react: { text: emoji, key } }); } catch {}
}

async function makeThumbnail(moviePosterUrl, hardThumbUrl, movieDocOn) {
  const primaryUrl  = (movieDocOn && moviePosterUrl) ? moviePosterUrl : hardThumbUrl;
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

function waitForReply(conn, from, replyToId, timeout) {
  if (!timeout) timeout = 120000;
  return new Promise(function(resolve, reject) {
    var handler = function(update) {
      var msg = update.messages && update.messages[0];
      if (!msg || !msg.message) return;
      var ctx  = msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo;
      var text = msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text);
      if (msg.key.remoteJid === from && ctx && ctx.stanzaId === replyToId) {
        conn.ev.off("messages.upsert", handler);
        resolve({ msg: msg, text: text });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(function() {
      conn.ev.off("messages.upsert", handler);
      reject(new Error("Reply timeout"));
    }, timeout);
  });
}

async function sendDocWithCaption(conn, from, info, file, quoted, footer, sessionId) {
  var movieDocOn = isMovieDocOn(sessionId);
  var hardThumb  = getHardThumbUrl(sessionId);
  var thumb      = await makeThumbnail(info.image || null, hardThumb, movieDocOn);

  var captionText = "🎬 *" + info.title + "*\n*" + file.quality + "*\n\n" + footer;
  var docMsg = await conn.sendMessage(from, {
    document: { url: file.url },
    fileName: (info.title + " (" + file.quality + ").mp4").replace(/[\/\\:*?"<>|]/g, ""),
    mimetype: "video/mp4",
    jpegThumbnail: thumb || undefined,
    caption: captionText
  }, { quoted: quoted });
  await react(conn, from, docMsg.key, "✅");
}

cmd({
  pattern: "cinesubz",
  desc: "CineSubz downloader",
  category: "downloader",
  react: "🍿",
  filename: __filename
}, async function(conn, mek, m, opts) {
  var from = opts.from, q = opts.q, reply = opts.reply, sessionId = opts.sessionId;
  try {
    if (!q) return reply("Example: .cinesubz Avangers");

    var footer = "✫ " + getBotName(sessionId) + " ✫";
    await react(conn, from, m.key, "🔍");

    var searchRes = await axios.get(
      "https://api-dark-shan-yt.koyeb.app/movie/cinesubz-search?q=" + encodeURIComponent(q) + "&apikey=edbcfabbca5a9750"
    );

    var results = searchRes.data && searchRes.data.data;
    if (!results || !results.length) return reply("No results found.");

    var listText = "🎬 *CineSubz Results*\n\n";
    results.slice(0, 10).forEach(function(v, i) {
      listText += "*" + (i + 1) + ".* " + v.title + "\n";
    });

    var listMsg = await conn.sendMessage(from, {
      text: listText + "\nReply with number\n\n" + footer
    }, { quoted: mek });

    var sel1 = await waitForReply(conn, from, listMsg.key.id);
    var index = parseInt(sel1.text) - 1;
    if (isNaN(index) || !results[index]) return reply("Invalid number.");
    await react(conn, from, sel1.msg.key, "🎬");

    var infoRes = await axios.get(
      "https://api-dark-shan-yt.koyeb.app/movie/cinesubz-info?url=" + encodeURIComponent(results[index].link) + "&apikey=edbcfabbca5a9750"
    );

    var info = infoRes.data && infoRes.data.data;
    if (!info) return reply("Failed to get movie info.");

    var infoText = "🎬 *" + info.title + "*\n\n";
    if (info.year)      infoText += "📅 *Year:* " + info.year + "\n";
    if (info.rating)    infoText += "⭐ *Rating:* " + info.rating + "\n";
    if (info.duration)  infoText += "⏱️ *Duration:* " + info.duration + "\n";
    if (info.country)   infoText += "🌍 *Country:* " + info.country + "\n";
    if (info.directors) infoText += "🎬 *Directors:* " + info.directors + "\n";

    infoText += "\n*Available Qualities:*";
    info.downloads.forEach(function(d, i) {
      infoText += "\n*" + (i + 1) + ".* " + d.quality + " (" + d.size + ")";
    });

    var infoMsg = await conn.sendMessage(from, {
      image: { url: info.image },
      caption: infoText + "\n\nReply with download number\n" + footer
    }, { quoted: sel1.msg });

    var sel2   = await waitForReply(conn, from, infoMsg.key.id);
    var dIndex = parseInt(sel2.text) - 1;
    if (isNaN(dIndex) || !info.downloads[dIndex]) return reply("Invalid download number.");
    await react(conn, from, sel2.msg.key, "⬇️");

    var dlRes = await axios.get(
      "https://api-dark-shan-yt.koyeb.app/movie/cinesubz-download?url=" + encodeURIComponent(info.downloads[dIndex].link) + "&apikey=edbcfabbca5a9750"
    );

    var downloadLinks = dlRes.data && dlRes.data.data && dlRes.data.data.download;

    var pix     = downloadLinks && downloadLinks.find(function(v) { return v.name.toLowerCase() === "pix"; });
    var unknown = downloadLinks && downloadLinks.find(function(v) { return v.name.toLowerCase() === "unknown"; });
    var selected = pix || unknown;

    if (!selected) return reply("No downloadable link found.");

    await sendDocWithCaption(
      conn, from, info,
      { url: selected.url, quality: info.downloads[dIndex].quality },
      sel2.msg, footer, sessionId
    );

  } catch (e) {
    console.error("CINESUBZ ERROR:", e.message);
    reply("Error: " + e.message);
  }
});

cmd({
  pattern: "cmoviedoc1",
  react: "🖼️",
  desc: "Toggle movie poster as doc thumbnail",
  category: "owner",
  filename: __filename
}, async function(conn, mek, m, opts) {
  var args = opts.args, reply = opts.reply, isOwner = opts.isOwner, sessionId = opts.sessionId;
  if (!isOwner) return reply("Owner only.");

  var sub = args[0] && args[0].toLowerCase();

  if (!sub || (sub !== "on" && sub !== "off")) {
    var current = isMovieDocOn(sessionId) ? "ON" : "OFF";
    return reply(
      "MovieDoc Status: " + current + "\n\n" +
      "ON  = Movie poster as thumbnail\n" +
      "OFF = Hard thumb always\n\n" +
      "Usage: .moviedoc on / .moviedoc off"
    );
  }

  var config = getSessionConfig(sessionId);
  config.movieDoc = (sub === "on");
  saveSessionConfig(sessionId, config);
  reply("MovieDoc is now " + sub.toUpperCase() + ".");
});

cmd({
  pattern: "csetfooter1",
  alias: ["botname"],
  react: "✏️",
  desc: "Set bot name used in footer",
  category: "owner",
  filename: __filename
}, async function(conn, mek, m, opts) {
  var q = opts.q, reply = opts.reply, isOwner = opts.isOwner, sessionId = opts.sessionId;
  if (!isOwner) return reply("Owner only.");
  if (!q) return reply("Example: .setfooter Sayura MD");
  var config = getSessionConfig(sessionId);
  config.botName = q.trim();
  saveSessionConfig(sessionId, config);
  reply("Bot name set to: " + q.trim());
});

cmd({
  pattern: "csetthumb1",
  alias: ["thumburl"],
  react: "🖼️",
  desc: "Set default thumbnail URL",
  category: "owner",
  filename: __filename
}, async function(conn, mek, m, opts) {
  var q = opts.q, reply = opts.reply, isOwner = opts.isOwner, sessionId = opts.sessionId;
  if (!isOwner) return reply("Owner only.");
  if (!q) return reply("Example: .setthumb https://example.com/image.jpg");
  if (!q.startsWith("http")) return reply("Please provide a valid URL.");
  var config = getSessionConfig(sessionId);
  config.thumbUrl = q.trim();
  saveSessionConfig(sessionId, config);
  reply("Hard thumb URL updated.");
});
