const { cmd } = require('../command');
const axios = require('axios');


cmd({
  pattern: "google",
  alias: ["gsearch","gsh"],
  desc: "Search Google via Chamod API",
  category: "search",
  react: "🔎",
  filename: __filename
},
async (conn, mek, m, { text }) => {
  try {
    if (!text) return m.reply("Please provide a search query!\nExample: .google tiktok");

    // Cloudflare Worker API call
    const apiUrl = `https://google-search-api.chamodshadow125.workers.dev/?q=${encodeURIComponent(text)}`;
    const res = await axios.get(apiUrl);

    if (res.data.status && res.data.data.length > 0) {
      let msg = `🔎 *Google Search Results*\n\n`;
      res.data.data.slice(0, 5).forEach((item, i) => {
        msg += `*${i+1}.* ${item.title}\n${item.link}\n_${item.snippet}_\n\n`;
      });
      m.reply(msg);
    } else {
      m.reply("No results found 😔");
    }
  } catch (error) {
    console.error(error);
    m.reply("Error fetching results.");
  }
});
