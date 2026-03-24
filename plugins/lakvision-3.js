const { cmd } = require("../command");
const axios = require("axios");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ───────── CONFIGURATION ─────────
const FOOTER = "𝐌𝐫.𝐇𝐚𝐬𝐢𝐲𝐚 𝐓𝐞𝐜𝐡 𝐌𝐨𝐯𝐢𝐞 © 𝟐𝟎𝟐𝟔 🇱🇰";
const API_BASE = "https://lakvision-tv.vercel.app/api";
const THUMB_URL = "https://image2url.com/r2/default/images/1774184263251-f9306abd-80ec-4b38-830e-73649a3d687e.png";

// ───────── Thumbnail Generator ─────────
async function makeThumbnail(url) {
    try {
        const sharp = require("sharp");
        const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        return await sharp(img.data).resize(300).jpeg({ quality: 65 }).toBuffer();
    } catch (e) {
        console.log("❌ Thumbnail error:", e.message);
        return null;
    }
}

// ───────── Download video with ytdl-core ─────────
async function downloadVideo(videoUrl, outputPath) {
    return new Promise((resolve, reject) => {
        // Try ytdl-core first for direct mp4 links or dailymotion
        const ytdlCmd = `yt-dlp -o "${outputPath}" "${videoUrl}" --no-playlist --merge-output-format mp4 --quiet`;
        exec(ytdlCmd, { timeout: 300000 }, (err, stdout, stderr) => {
            if (err) {
                console.log("yt-dlp error:", stderr);
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ───────── Download m3u8/direct URL with ffmpeg ─────────
async function downloadWithFFmpeg(m3u8Url, outputPath) {
    return new Promise((resolve, reject) => {
        const cmd = `ffmpeg -i "${m3u8Url}" -c copy -bsf:a aac_adtstoasc "${outputPath}" -y`;
        exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
            if (err) {
                console.log("ffmpeg error:", stderr);
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
}

// ───────── Multi-Reply Smart Waiter ─────────
function waitForReply(conn, from, sender, targetId, timeoutMs = 600000) {
    return new Promise((resolve) => {
        let resolved = false;
        const handler = (update) => {
            const msg = update.messages?.[0];
            if (!msg?.message) return;

            const text =
                msg.message.conversation ||
                msg.message?.extendedTextMessage?.text ||
                "";
            const context = msg.message?.extendedTextMessage?.contextInfo;
            const msgSender = msg.key.participant || msg.key.remoteJid;

            const isTargetReply = context?.stanzaId === targetId;
            const isCorrectUser =
                msgSender.includes(sender.split("@")[0]) ||
                msgSender.includes("@lid");

            if (
                msg.key.remoteJid === from &&
                isCorrectUser &&
                isTargetReply &&
                !isNaN(text.trim())
            ) {
                if (!resolved) {
                    resolved = true;
                    conn.ev.off("messages.upsert", handler);
                    resolve({ msg, text: text.trim() });
                }
            }
        };

        conn.ev.on("messages.upsert", handler);
        setTimeout(() => {
            if (!resolved) {
                conn.ev.off("messages.upsert", handler);
                resolve(null);
            }
        }, timeoutMs);
    });
}

// ───────── Main Command ─────────
cmd(
    {
        pattern: "lakvision",
        alias: ["laktv", "lk", "lakmovie"],
        desc: "LakVision TV - Movies & TV Episodes Downloader",
        category: "downloader",
        react: "🎬",
        filename: __filename,
    },
    async (conn, mek, m, { from, q, reply, sender }) => {
        try {
            if (!q) return reply("❗ කරුණාකර චිත්‍රපටය හෝ ටෙලිනාටකය නම ටයිප් කරන්න.\nඋදා: .lakvision aladin");

            // ── Step 1: Search ──
            await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

            const searchRes = await axios.get(
                `${API_BASE}?action=search&query=${encodeURIComponent(q)}`,
                { timeout: 15000 }
            );
            const results = searchRes.data?.results;

            if (!results?.length) return reply("❌ ප්‍රතිඵල හමු නොවීය. වෙනත් නමක් උත්සාහ කරන්න.");

            // Build search list (top 10)
            let listText = `🎬 *𝐋𝐀𝐊𝐕𝐈𝐒𝐈𝐎𝐍 𝐓𝐕 𝐒𝐄𝐀𝐑𝐂𝐇 𝐑𝐄𝐒𝐔𝐋𝐓𝐒*\n`;
            listText += `🔎 *Query:* ${q}\n\n`;
            results.slice(0, 10).forEach((v, i) => {
                listText += `*${i + 1}.* ${v.title}\n`;
            });
            listText += `\n📌 *අංකය Reply කරන්න* (කිහිප වතාවක් තෝරාගත හැක)`;

            const sentSearch = await conn.sendMessage(
                from,
                { text: listText },
                { quoted: mek }
            );

            // ── Search List Reply Loop ──
            const searchLoop = async () => {
                while (true) {
                    const sel = await waitForReply(conn, from, sender, sentSearch.key.id);
                    if (!sel) break;

                    const idx = parseInt(sel.text) - 1;
                    const chosen = results[idx];
                    if (!chosen) continue;

                    await conn.sendMessage(from, {
                        react: { text: "⏳", key: sel.msg.key },
                    });

                    // Fetch video details (non-blocking)
                    handleVideoFlow(conn, from, sender, chosen, sel.msg);
                }
            };

            searchLoop();
        } catch (e) {
            console.log("LakVision Error:", e);
            reply("❌ දෝෂයක් සිදු විය. නැවත උත්සාහ කරන්න.");
        }
    }
);

// ───────── Video Flow Handler ─────────
async function handleVideoFlow(conn, from, sender, item, quotedMsg) {
    try {
        // Fetch watch/embed details
        const watchRes = await axios.get(
            `${API_BASE}?action=watch&id=${item.id}`,
            { timeout: 15000 }
        );
        const data = watchRes.data;

        if (!data || data.status === false) {
            return await conn.sendMessage(
                from,
                { text: "❌ Video details ලබාගැනීමට නොහැකි විය." },
                { quoted: quotedMsg }
            );
        }

        const videoUrls = data.video_urls || [];
        if (!videoUrls.length) {
            return await conn.sendMessage(
                from,
                { text: "❌ Video links හමු නොවීය." },
                { quoted: quotedMsg }
            );
        }

        // Filter useful links (m3u8, direct mp4, or iframe/dailymotion)
        const playableLinks = videoUrls.filter(
            (v) =>
                v.url &&
                (v.label.includes("m3u8") ||
                    v.label.includes("mp4") ||
                    v.label.includes("dailymotion") ||
                    v.label.includes("iframe"))
        );

        if (!playableLinks.length) {
            return await conn.sendMessage(
                from,
                { text: "❌ Playable video links හමු නොවීය." },
                { quoted: quotedMsg }
            );
        }

        // Show quality/source selection
        let qualText = `🎬 *${data.title}*\n\n`;
        qualText += `📺 *Video Sources:*\n\n`;
        playableLinks.forEach((v, i) => {
            const label = v.label
                .replace("dailymotion-m3u8", "📡 Dailymotion M3U8 (HD)")
                .replace("iframe", "🖥️ Iframe Player")
                .replace("mp4", "🎞️ Direct MP4");
            qualText += `*${i + 1}.* ${label}\n`;
        });
        qualText += `\n📌 *Source අංකය Reply කරන්න*`;

        const sentQual = await conn.sendMessage(
            from,
            { text: qualText },
            { quoted: quotedMsg }
        );

        // Quality selection loop (multi-reply)
        const qualLoop = async () => {
            while (true) {
                const qSel = await waitForReply(conn, from, sender, sentQual.key.id);
                if (!qSel) break;

                const qIdx = parseInt(qSel.text) - 1;
                const chosenLink = playableLinks[qIdx];
                if (!chosenLink) continue;

                // Download in background
                downloadAndSend(conn, from, sender, data, chosenLink, qSel.msg);
            }
        };

        qualLoop();
    } catch (e) {
        console.log("Video flow error:", e);
        await conn.sendMessage(
            from,
            { text: "❌ Video ලබාගැනීමේ දෝෂයක් සිදු විය." },
            { quoted: quotedMsg }
        );
    }
}

// ───────── Download & Send Handler ─────────
async function downloadAndSend(conn, from, sender, data, linkObj, quotedMsg) {
    const tmpDir = "/tmp";
    const safeTitle = data.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    const outputPath = path.join(tmpDir, `${safeTitle}_${Date.now()}.mp4`);

    try {
        await conn.sendMessage(from, {
            react: { text: "📥", key: quotedMsg.key },
        });

        await conn.sendMessage(
            from,
            {
                text: `⏳ *Downloading...*\n\n🎬 *${data.title}*\n📡 *Source:* ${linkObj.label}\n\nකරුණාකර රැඳී සිටින්න...`,
            },
            { quoted: quotedMsg }
        );

        let videoUrl = linkObj.url;

        // For iframe/dailymotion embed, extract the direct m3u8 or use yt-dlp
        const isEmbed =
            linkObj.label.includes("iframe") ||
            linkObj.url.includes("dailymotion.com/embed");

        let filePath;

        if (isEmbed) {
            // Use yt-dlp for dailymotion embed URLs
            try {
                // Extract the video ID from dailymotion embed URL
                const dmMatch = linkObj.url.match(/\/video\/([\w]+)/);
                const dmUrl = dmMatch
                    ? `https://www.dailymotion.com/video/${dmMatch[1]}`
                    : linkObj.url;

                filePath = await downloadVideo(dmUrl, outputPath);
            } catch (dlErr) {
                // Fallback to m3u8 if available from same item
                throw new Error("Download failed: " + dlErr.message);
            }
        } else if (linkObj.label.includes("m3u8") || videoUrl.includes(".m3u8")) {
            // Use ffmpeg for m3u8 streams
            filePath = await downloadWithFFmpeg(videoUrl, outputPath);
        } else {
            // Direct download
            const resp = await axios({
                method: "get",
                url: videoUrl,
                responseType: "arraybuffer",
                timeout: 300000,
                onDownloadProgress: (progressEvent) => {
                    const percent = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    if (percent % 25 === 0) console.log(`Download: ${percent}%`);
                },
            });
            fs.writeFileSync(outputPath, resp.data);
            filePath = outputPath;
        }

        // Check file exists and has size
        const stats = fs.statSync(filePath);
        if (!stats.size) throw new Error("Empty file downloaded");

        // Get thumbnail
        const thumb = await makeThumbnail(THUMB_URL);

        // Build file name
        const fileName = `${data.title} [${linkObj.label}].mp4`;

        // Send as document (video file)
        await conn.sendMessage(
            from,
            {
                document: fs.readFileSync(filePath),
                mimetype: "video/mp4",
                fileName: fileName,
                jpegThumbnail: thumb,
                caption:
                    `✅ *Download Complete!*\n\n` +
                    `🎬 *Title:* ${data.title}\n` +
                    `📡 *Source:* ${linkObj.label}\n` +
                    `📁 *File:* ${fileName}\n\n` +
                    `${FOOTER}`,
            },
            { quoted: quotedMsg }
        );

        await conn.sendMessage(from, {
            react: { text: "✅", key: quotedMsg.key },
        });

        // Clean up temp file
        try {
            fs.unlinkSync(filePath);
        } catch {}
    } catch (e) {
        console.log("Download/Send error:", e);

        // Clean up on error
        try {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch {}

        await conn.sendMessage(
            from,
            {
                text:
                    `❌ *Download Failed*\n\n` +
                    `🎬 *${data.title}*\n` +
                    `📡 *Source:* ${linkObj.label}\n\n` +
                    `⚠️ දෝෂය: ${e.message}\n\n` +
                    `🔗 *Manual Link:*\n${linkObj.url}`,
            },
            { quoted: quotedMsg }
        );

        await conn.sendMessage(from, {
            react: { text: "❌", key: quotedMsg.key },
        });
    }
}
