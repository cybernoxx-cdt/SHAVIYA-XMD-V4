const config = require('../config');
const fg = require('api-dylux');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { cmd, commands } = require('../command');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions2');

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

function saveSessionConfig(sessionId, cfg) {
  try {
    const dataFolder = path.join(__dirname, '../data');
    if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
    const file = path.join(dataFolder, `session_config_${sessionId}.json`);
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
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

function getDocPrefix(sessionId) {
  return getSessionConfig(sessionId).docPrefix || "SHAVIYA-XMD V4";
}

function getFilePrefix(sessionId) {
  return getSessionConfig(sessionId).filePrefix || "【SHAVIYA-XMD V2】";
}

// ═══════════════════════════════════════════════════
//  Thumbnail Builder
// ═══════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════
//  Wait for reply
// ═══════════════════════════════════════════════════
function waitForReply(conn, from, sender, targetId, timeout = 600000) {
  return new Promise((resolve) => {
    let settled = false;
    const handler = (update) => {
      const msg = update.messages?.[0];
      if (!msg?.message) return;
      const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || "";
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const msgSender = msg.key.participant || msg.key.remoteJid;
      const isTargetReply = context?.stanzaId === targetId;
      const isCorrectUser = msgSender.includes(sender.split('@')[0]) || msgSender.includes("@lid");
      if (msg.key.remoteJid === from && isCorrectUser && isTargetReply && !isNaN(text) && text !== "") {
        if (settled) return;
        settled = true;
        conn.ev.off("messages.upsert", handler);
        resolve({ msg, text: text.trim() });
      }
    };
    conn.ev.on("messages.upsert", handler);
    setTimeout(() => {
      if (settled) return;
      conn.ev.off("messages.upsert", handler);
      resolve(null);
    }, timeout);
  });
}

const API_KEY = "edbcfabbca5a9750";
const BASE_URL = "https://api-dark-shan-yt.koyeb.app";

// ═══════════════════════════════════════════════════
//  Download Link Resolver — gdrive → pix → unknown fallback
// ═══════════════════════════════════════════════════
async function resolveDownloadLink(dlUrl, label) {
  const res = await axios.get(`${BASE_URL}/movie/cinesubz-download?url=${encodeURIComponent(dlUrl)}&apikey=${API_KEY}`);
  const data  = res.data?.data || {};
  const links = data.download || [];
  const apiTitle = data.title || null;
  const apiSize  = data.size  || null;
  console.log(`🔗 [CINETV] ${label} links:`, links.map(l => l.name).join(', '));

  // 1. GDrive
  const gdriveRaw = links.find(d => d.name?.toLowerCase() === "gdrive")?.url;
  if (gdriveRaw) {
    const driveUrl = gdriveRaw
      .replace('https://drive.usercontent.google.com/download?id=', 'https://drive.google.com/file/d/')
      .replace('&export=download', '/view');
    console.log(`🚀 [CINETV] ${label} → GDrive: ${driveUrl}`);
    const r = await fg.GDriveDl(driveUrl);
    console.log(`📦 [CINETV] ${label} GDrive OK: ${r.fileName} | ${r.fileSize}`);
    return { type: 'gdrive', url: r.downloadUrl, fileName: r.fileName, fileSize: r.fileSize, mimetype: r.mimetype };
  }

  // 2. Pixeldrain
  const pix = links.find(d => d.name?.toLowerCase().includes("pix"))?.url;
  if (pix) {
    const fileId = pix.split('/').pop().split('?')[0];
    const pixUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
    console.log(`🚀 [CINETV] ${label} → Pixeldrain: ${pixUrl}`);
    return { type: 'pix', url: pixUrl, fileName: apiTitle, fileSize: apiSize, mimetype: 'video/mp4' };
  }

  // 3. Unknown/Direct — telegram skip
  const direct = links.find(d => {
    const name = d.name?.toLowerCase() || '';
    const url  = d.url || '';
    if (name === 'telegram' || url.includes('t.me')) return false;
    return name === 'unknown' || (url.startsWith('http') && !url.includes('t.me'));
  })?.url;

  if (direct) {
    console.log(`🚀 [CINETV] ${label} → Direct: ${direct}`);
    return { type: 'direct', url: direct, fileName: apiTitle, fileSize: apiSize, mimetype: 'video/mp4' };
  }

  console.log(`❌ [CINETV] ${label} → No downloadable link found`);
  return null;
}

// ═══════════════════════════════════════════════════
//  MAIN COMMAND
// ═══════════════════════════════════════════════════
cmd({
  pattern: "cinetv",
  alias: ["movie", "cinesubz"],
  desc: "Infinity Multi-Season & Episode Downloader",
  category: "downloader",
  react: "🎬",
  filename: __filename,
}, async (conn, mek, m, { from, q, reply, sender, l, sessionId }) => {
  try {
    if (!q) return reply("❗ Please Reply Movie name or Tv Serious.");

    const FOOTER      = `✫☘${getBotName(sessionId)}☢️☘`;
    const hardThumb   = getHardThumbUrl(sessionId);
    const movieDocOn  = isMovieDocOn(sessionId);
    const DOC_PREFIX  = getDocPrefix(sessionId);
    const FILE_PREFIX = getFilePrefix(sessionId);

    console.log(`\n🔍 [CINETV] Search: "${q}" | session: ${sessionId} | movieDoc: ${movieDocOn}`);

    // 1. Search
    const searchRes = await axios.get(`${BASE_URL}/movie/cinesubz-search?q=${encodeURIComponent(q)}&apikey=${API_KEY}`);
    const results = searchRes.data?.data;
    console.log(`📂 [CINETV] Found ${results?.length || 0} results`);
    if (!results?.length) return reply("❌ Not Find Movie & Tv Serious.");

    let listText = "🎬 *𝐂𝐈𝐍𝐄𝐒𝐔𝐁𝐙 𝐈𝐍𝐅𝐈𝐍𝐈𝐓𝐘 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n";
    results.slice(0, 15).forEach((v, i) => { listText += `*${i + 1}.* ${v.title} (${v.quality})\n`; });
    const sentSearch = await conn.sendMessage(from, { text: listText + `\nNumber Reply Now.\n\n${FOOTER}` }, { quoted: m });

    // ── Download & Quality Handler ──
    async function handleDownload(conn, from, sender, dlLinks, title, quotedMsg, posterUrl) {
      try {
        if (!dlLinks?.length) return;

        let qText = `🎬 *Select Quality:*\n*${title}*`;
        dlLinks.forEach((dl, i) => { qText += `\n*${i + 1}.* ${dl.quality} (${dl.size})`; });
        const sentQual = await conn.sendMessage(from, { text: qText + `\n\nQuality අංකය එවන්න.\n\n${FOOTER}` }, { quoted: quotedMsg });

        const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
        if (!qSel) return;

        const chosenDl = dlLinks[parseInt(qSel.text) - 1];
        if (!chosenDl) return;

        console.log(`⬇️ [CINETV] Downloading: ${title} | Quality: ${chosenDl.quality}`);

        const dlResult = await resolveDownloadLink(chosenDl.link, title);
        if (!dlResult) {
          await conn.sendMessage(from, { text: `❌ Download link හමු නොවීය.\n*${title}*` }, { quoted: qSel.msg });
          return;
        }

        await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });

        const thumb = await makeThumbnail(posterUrl || null, hardThumb, movieDocOn);
        const cleanName    = dlResult.fileName ? dlResult.fileName.replace('[Cinesubz.co]', '').trim() : `${title} (${chosenDl.quality}).mp4`;
        const finalFileName = `${FILE_PREFIX} ${cleanName}`;
        const fileSize     = dlResult.fileSize || chosenDl.size || '';

        const docMsg = await conn.sendMessage(from, {
          document: { url: dlResult.url },
          fileName: finalFileName,
          mimetype: dlResult.mimetype,
          jpegThumbnail: thumb,
          caption: `🎬 *File:* 【${DOC_PREFIX}】 ${cleanName}\n⚖️ *Size:* ${fileSize}\n💎 *Quality:* ${chosenDl.quality}\n\n${FOOTER}`
        }, { quoted: qSel.msg });

        console.log(`✅ [CINETV] Sent: ${finalFileName}`);
        await conn.sendMessage(from, { react: { text: "✅", key: docMsg.key } });

      } catch (err) { console.log(`❌ [CINETV] handleDownload error:`, err.message); }
    }

    // ── Infinite Search Loop ──
    const startSearchFlow = async () => {
      while (true) {
        const selection = await waitForReply(conn, from, sender, sentSearch.key.id);
        if (!selection) break;

        (async () => {
          const idx = parseInt(selection.text) - 1;
          const selectedItem = results[idx];
          if (!selectedItem) return;

          console.log(`🎬 [CINETV] Selected: ${selectedItem.title} | type: ${selectedItem.type}`);
          await conn.sendMessage(from, { react: { text: "⏳", key: selection.msg.key } });

          if (selectedItem.type === "tvshows") {
            // ── TV Show ──
            console.log(`📺 [CINETV] Fetching TV info: ${selectedItem.link}`);
            const infoRes = await axios.get(`${BASE_URL}/tv/cinesubz-info?url=${encodeURIComponent(selectedItem.link)}&apikey=${API_KEY}`);
            const tvData = infoRes.data.data;
            console.log(`📺 [CINETV] TV: ${tvData.title} | Seasons: ${tvData.seasons?.length}`);

            let seasonText = `📺 *${tvData.title}*\n\n*Select Season:*`;
            tvData.seasons.forEach((s, i) => { seasonText += `\n*${i + 1}.* Season ${s.s_no}`; });

            const sentSeason = await conn.sendMessage(from, {
              image: { url: movieDocOn ? (tvData.image || hardThumb) : hardThumb },
              caption: seasonText + `\n\nසීසන් අංකය එවන්න.\n\n${FOOTER}`
            }, { quoted: selection.msg });

            const startSeasonFlow = async () => {
              while (true) {
                const sSel = await waitForReply(conn, from, sender, sentSeason.key.id);
                if (!sSel) break;

                (async () => {
                  const sIdx = parseInt(sSel.text) - 1;
                  const chosenSeason = tvData.seasons[sIdx];
                  if (!chosenSeason) return;

                  console.log(`📺 [CINETV] Season ${chosenSeason.s_no} | Episodes: ${chosenSeason.episodes?.length}`);

                  let epText = `📺 *${tvData.title} - Season ${chosenSeason.s_no}*\n\n*Select Episode:*\n*0.* 🎯 All Episodes`;
                  chosenSeason.episodes.forEach((ep, i) => { epText += `\n*${i + 1}.* Episode ${ep.e_no}`; });
                  const sentEp = await conn.sendMessage(from, { text: epText + `\n\nඑපිසෝඩ් අංකය එවන්න.\n*(0 = සියලු episodes)*\n\n${FOOTER}` }, { quoted: sSel.msg });

                  const startEpFlow = async () => {
                    while (true) {
                      const epSel = await waitForReply(conn, from, sender, sentEp.key.id);
                      if (!epSel) break;

                      (async () => {
                        const epNum = parseInt(epSel.text);

                        if (epNum === 0) {
                          // ── All Episodes ──
                          console.log(`📥 [CINETV] All Episodes: S${chosenSeason.s_no}`);
                          await conn.sendMessage(from, { react: { text: "⏳", key: epSel.msg.key } });

                          const firstEp = chosenSeason.episodes[0];
                          const firstInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(firstEp.link)}&apikey=${API_KEY}`);
                          const dlLinks = firstInfoRes.data.data.download;
                          if (!dlLinks?.length) return;

                          let qText = `🎬 *Select Quality for All Episodes:*\n*${tvData.title} - Season ${chosenSeason.s_no}*`;
                          dlLinks.forEach((dl, i) => { qText += `\n*${i + 1}.* ${dl.quality} (${dl.size})`; });
                          const sentQual = await conn.sendMessage(from, { text: qText + `\n\nQuality අංකය එවන්න.\n\n${FOOTER}` }, { quoted: epSel.msg });

                          const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
                          if (!qSel) return;

                          const chosenQuality = dlLinks[parseInt(qSel.text) - 1];
                          if (!chosenQuality) return;

                          console.log(`📥 [CINETV] All Episodes Quality: ${chosenQuality.quality}`);
                          await conn.sendMessage(from, { react: { text: "📥", key: qSel.msg.key } });
                          await conn.sendMessage(from, {
                            text: `⬇️ *Downloading all ${chosenSeason.episodes.length} episodes...*\n*${tvData.title} - Season ${chosenSeason.s_no}*\n*Quality:* ${chosenQuality.quality}\n\n${FOOTER}`
                          }, { quoted: qSel.msg });

                          for (const ep of chosenSeason.episodes) {
                            try {
                              console.log(`📥 [CINETV] Episode ${ep.e_no}...`);
                              const epInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(ep.link)}&apikey=${API_KEY}`);
                              const epDlLinks = epInfoRes.data.data.download;
                              const matchedDl = epDlLinks[parseInt(qSel.text) - 1] || epDlLinks[0];
                              if (!matchedDl) continue;

                              const dlResult = await resolveDownloadLink(matchedDl.link, `S${chosenSeason.s_no}E${ep.e_no}`);
                              if (!dlResult) { console.log(`❌ [CINETV] No link: E${ep.e_no}`); continue; }

                              const thumb = await makeThumbnail(tvData.image || null, hardThumb, movieDocOn);
                              const cleanName    = dlResult.fileName ? dlResult.fileName.replace('[Cinesubz.co]', '').trim() : `${tvData.title} S${chosenSeason.s_no}E${ep.e_no} (${matchedDl.quality}).mp4`;
                              const finalFileName = `${FILE_PREFIX} ${cleanName}`;
                              const fileSize     = dlResult.fileSize || matchedDl.size || '';

                              const docMsg = await conn.sendMessage(from, {
                                document: { url: dlResult.url },
                                fileName: finalFileName,
                                mimetype: dlResult.mimetype,
                                jpegThumbnail: thumb,
                                caption: `📺 *File:* 【${DOC_PREFIX}】 ${cleanName}\n🎬 *S${chosenSeason.s_no} E${ep.e_no}*\n⚖️ *Size:* ${fileSize}\n💎 *Quality:* ${matchedDl.quality}\n\n${FOOTER}`
                              }, { quoted: qSel.msg });

                              console.log(`✅ [CINETV] Sent E${ep.e_no}: ${finalFileName}`);
                              await conn.sendMessage(from, { react: { text: "✅", key: docMsg.key } });

                            } catch (err) {
                              console.log(`❌ [CINETV] Episode ${ep.e_no} failed:`, err.message);
                              await conn.sendMessage(from, {
                                text: `❌ *Episode ${ep.e_no} download failed*\n${err.message}`
                              }, { quoted: qSel.msg });
                            }
                          }

                          console.log(`✅ [CINETV] All episodes done: S${chosenSeason.s_no}`);
                          await conn.sendMessage(from, {
                            text: `✅ *සියලු episodes download සම්පූර්ණයි!*\n*${tvData.title} - Season ${chosenSeason.s_no}*\n\n${FOOTER}`
                          }, { quoted: qSel.msg });

                        } else {
                          // ── Single Episode ──
                          const epIdx = epNum - 1;
                          const selectedEp = chosenSeason.episodes[epIdx];
                          if (!selectedEp) return;

                          console.log(`📺 [CINETV] Single Episode: S${chosenSeason.s_no}E${selectedEp.e_no}`);
                          const epInfoRes = await axios.get(`${BASE_URL}/episode/cinesubz-info?url=${encodeURIComponent(selectedEp.link)}&apikey=${API_KEY}`);
                          await handleDownload(conn, from, sender,
                            epInfoRes.data.data.download,
                            `${tvData.title} S${chosenSeason.s_no} E${selectedEp.e_no}`,
                            epSel.msg,
                            tvData.image || null);
                        }
                      })();
                    }
                  };
                  startEpFlow();
                })();
              }
            };
            startSeasonFlow();

          } else {
            // ── Movie ──
            console.log(`🎬 [CINETV] Fetching movie info: ${selectedItem.link}`);
            const movieInfoRes = await axios.get(`${BASE_URL}/movie/cinesubz-info?url=${encodeURIComponent(selectedItem.link)}&apikey=${API_KEY}`);
            console.log(`🎬 [CINETV] Movie info OK: ${movieInfoRes.data?.data?.title}`);
            await handleDownload(conn, from, sender,
              movieInfoRes.data.data.download,
              selectedItem.title,
              selection.msg,
              movieInfoRes.data.data.image || null);
          }
        })();
      }
    };

    startSearchFlow();

  } catch (e) { l(e); reply("❌ දෝෂයක් සිදු විය."); }
});

// ═══════════════════════════════════════════════════
//  MOVIEDOC ON/OFF
// ═══════════════════════════════════════════════════
cmd({
  pattern: "cmoviedoc2",
  alias: ["moviedoc"],
  react: "🖼️",
  desc: "Doc thumbnail එකට movie poster use කිරීම on/off",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { args, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ Owner ට විතරයි.");
  const sub = args[0]?.toLowerCase();
  if (!sub || (sub !== 'on' && sub !== 'off')) {
    const current = isMovieDocOn(sessionId) ? '✅ ON' : '❌ OFF';
    return reply(`🖼️ *MovieDoc Thumbnail Status*\n\nCurrent: ${current}\n\n✅ *ON*  → Movie poster\n❌ *OFF* → Hard thumb\n\nUsage: *.moviedoc on*`);
  }
  const cfg = getSessionConfig(sessionId);
  cfg.movieDoc = (sub === 'on');
  saveSessionConfig(sessionId, cfg);
  reply(sub === 'on'
    ? "✅ *MovieDoc ON!* Movie poster use කරනවා."
    : "❌ *MovieDoc OFF!* Hard thumb use කරනවා.");
});

// ═══════════════════════════════════════════════════
//  SET FOOTER
// ═══════════════════════════════════════════════════
cmd({
  pattern: "csetfooter2",
  alias: ["botname"],
  react: "✏️",
  desc: "Bot name (footer) set කිරීම",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ Owner ට විතරයි.");
  if (!q) return reply("📌 *Example:* `.setfooter Sayura MD`");
  const cfg = getSessionConfig(sessionId);
  cfg.botName = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Footer set:* ${q.trim()} 🎉`);
});

// ═══════════════════════════════════════════════════
//  SET DOC PREFIX (caption ඉස්සරහින්)
// ═══════════════════════════════════════════════════
cmd({
  pattern: "csetprefix",
  alias: ["docprefix"],
  react: "🏷️",
  desc: "Caption 【prefix】 set කිරීම",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ Owner ට විතරයි.");
  if (!q) {
    const cur = getDocPrefix(sessionId);
    return reply(`🏷️ *Caption Prefix*\n\nCurrent: 【${cur}】\nPreview: 🎬 *File:* 【${cur}】 Movie.mp4\n\nUsage: *.setprefix SAYURA MD*`);
  }
  const cfg = getSessionConfig(sessionId);
  cfg.docPrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Caption prefix set!*\nPreview: 🎬 *File:* 【${q.trim()}】 Movie.mp4 🎉`);
});

// ═══════════════════════════════════════════════════
//  SET THUMB
// ═══════════════════════════════════════════════════
cmd({
  pattern: "csetthumb2",
  alias: ["thumburl"],
  react: "🖼️",
  desc: "Default thumbnail URL set කිරීම",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ Owner ට විතරයි.");
  if (!q) return reply("📌 *Example:* `.setthumb https://example.com/image.jpg`");
  if (!q.startsWith("http")) return reply("❌ Valid URL එකක් දාන්න.");
  const cfg = getSessionConfig(sessionId);
  cfg.thumbUrl = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *Thumb URL set!* 🎉`);
});

// ═══════════════════════════════════════════════════
//  SET FILE NAME PREFIX (doc title ඉස්සරහින්)
// ═══════════════════════════════════════════════════
cmd({
  pattern: "csetfname",
  react: "🏷️",
  desc: "Document file name ඉස්සරහින් prefix set කිරීම",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { q, reply, isOwner, sessionId }) => {
  if (!isOwner) return reply("❌ Owner ට විතරයි.");
  if (!q) {
    const cur = getFilePrefix(sessionId);
    return reply(`🏷️ *File Name Prefix*\n\nCurrent: ${cur}\nPreview: ${cur} Movie Name.mp4\n\nUsage: *.setfname 【SAYURA MD】*`);
  }
  const cfg = getSessionConfig(sessionId);
  cfg.filePrefix = q.trim();
  saveSessionConfig(sessionId, cfg);
  reply(`✅ *File prefix set!*\nPreview: ${q.trim()} Movie Name.mp4 🎉`);
});
