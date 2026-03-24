const { cmd } = require("../command");
const axios = require("axios");

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© SHAVIYA TECH",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:SHAVIYA-XMD V4
ORG:SHAVIYA TECH;
TEL;type=CELL;type=VOICE;waid=94707085822:+94707085822
END:VCARD`
        }
    }
};


cmd({
    pattern: "img",
    react: "🖼️",
    desc: "Search and download Google images",
    category: "download",
    use: ".img <keywords>",
    filename: __filename
}, async (conn, mek, m, { reply, args, from }) => {
    try {
        const query = args.join(" ");
        if (!query) {
            return reply("🖼️ Please provide a search query\nExample: .img cute cats");
        }

        await reply(`🔍 Searching images for *"${query}"*...`);

        const api = `https://malvin-api.vercel.app/search/gimage?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(api);

        // Check response validity
        if (!data?.status || !Array.isArray(data.result) || data.result.length === 0) {
            return reply("❌ No images found. Try different keywords.");
        }

        // Extract URLs
        const images = data.result.map(img => img.url);

        await reply(`✅ Found *${images.length}* results for *"${query}"*. Sending top 5...`);

        // Shuffle & pick 5
        const selectedImages = images
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        for (const imageUrl of selectedImages) {
            try {
                await conn.sendMessage(
                    from,
                    {
                        image: { url: imageUrl },
                        caption: `📷 Result for: *${query}*\n> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`,
                        contextInfo: { mentionedJid: [m.sender] }
                    },
                    { quoted: fakevCard }
                );
            } catch (err) {
                console.warn(`⚠️ Failed to send image: ${imageUrl}`);
            }

            await new Promise(res => setTimeout(res, 1000)); // small delay
        }

    } catch (error) {
        console.error("Image Search Error:", error);
        reply(`❌ Error: ${error.message || "Failed to fetch images"}`);
    }
});


cmd({
    pattern: "image",
    react: "🖼️",
    desc: "Search and download Images",
    category: "download",
    use: ".image <keywords>",
    filename: __filename
}, async (conn, mek, m, { reply, args, from }) => {
    try {
        const query = args.join(" ");
        if (!query) {
            return reply("🖼️ Please provide a search term!\nExample: *.image cute cats*");
        }

        await reply(`🔍 Searching Images for *"${query}"*...`);

        const apiUrl = `https://www.movanest.xyz/v2/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl);

        // ✅ Correct validation
        if (
            !response.data?.status ||
            !response.data?.results?.images ||
            response.data.results.images.length === 0
        ) {
            return reply("❌ No Images found. Try a different keyword.");
        }

        const images = response.data.results.images.map(img => img.url);

        await reply(`✅ Found *${images.length}* Images for *"${query}"*\n📤 Sending top 5...`);

        // 🎲 Pick random 5
        const selectedImages = images
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        for (const imageUrl of selectedImages) {
            try {
                await conn.sendMessage(
                    from,
                    {
                        image: { url: imageUrl },
                        caption: `🖼️ Image for: *${query}*\n> © Powered by 𝗦𝗛𝗔𝗩𝗜𝗬𝗔-𝗫𝗠𝗗 𝗩𝟰 🌛`,
                        contextInfo: {
                            mentionedJid: [m.sender]
                        }
                    },
                    { quoted: fakevCard }
                );
            } catch (err) {
                console.log("⚠️ Failed to send image:", err.message);
            }

            // ⏳ delay (anti-ban)
            await new Promise(res => setTimeout(res, 1000));
        }

    } catch (error) {
        console.error("Image Search Error:", error);
        reply(`❌ Error: ${error.message || "Failed to fetch images"}`);
    }
});                                  
