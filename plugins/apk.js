const { cmd } = require("../command");
const axios = require("axios");

let apkResults = {};

cmd(
{
pattern: "apk",
alias: ["android","af"],
react: "📱",
desc: "Search and download APK",
category: "download",
filename: __filename
},
async (conn, mek, m, { q, reply, from }) => {

if (!q) return reply("❌ *Please give an app name*\n\nExample:\n.apk spotify");

await conn.sendMessage(from,{react:{text:"⏳",key:mek.key}});

try{

const url = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=5`;
const { data } = await axios.get(url);

if(!data?.datalist?.list?.length){
return reply("❌ *No apps found*");
}

const apps = data.datalist.list;

apkResults[from] = apps;

let list = `📦 *APK SEARCH RESULTS*\n\n`;

apps.forEach((app,i)=>{

const size = (app.size / 1048576).toFixed(2);

list += `*${i+1}.* ${app.name}\n`;
list += `⭐ Rating: ${app.stats.rating.avg}\n`;
list += `💾 Size: ${size} MB\n\n`;

});

list += `\n📥 *Reply with number to download*\nExample: 1`;

await conn.sendMessage(from,{text:list},{quoted:mek});

}catch(e){
console.log(e);
reply("❌ Error while searching app");
}

}
);

cmd(
{
on: "text"
},
async (conn, mek, m, { body, from }) => {

if(!apkResults[from]) return;

if(!/^[1-5]$/.test(body)) return;

const index = Number(body) - 1;
const app = apkResults[from][index];

if(!app) return;

try{

const caption = `📦 *APK DOWNLOADER*

📱 Name: ${app.name}
⭐ Rating: ${app.stats.rating.avg}
📥 Downloads: ${app.stats.downloads}

⬇️ Downloading APK...`;

await conn.sendMessage(from,{
image:{url:app.icon},
caption:caption
},{quoted:mek});

await conn.sendMessage(from,{
document:{url:app.file.path_alt},
fileName:`${app.name}.apk`,
mimetype:"application/vnd.android.package-archive"
},{quoted:mek});

delete apkResults[from];

}catch(e){
console.log(e);
}

}
);
