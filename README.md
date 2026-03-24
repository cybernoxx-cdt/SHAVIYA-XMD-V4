# 🤖 SHAVIYA-XMD V4 FIXED

> Premium WhatsApp Multi-Device Bot — Fully Fixed & Production Ready

![Version](https://img.shields.io/badge/Version-V4-blue)
![Node](https://img.shields.io/badge/Node-20.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✅ What's Fixed in V4

- ✅ Menu `❌ Main error: 404` — **FIXED**
- ✅ Owner name shows **Savendra** correctly
- ✅ Antidelete **OFF by default** (use `.antidelete on` to enable)
- ✅ Movie menu works after first reply — **all 9 sources**
- ✅ Movie menu timeout: **20 minutes**
- ✅ General menu timeout: **10 minutes**
- ✅ Ping redesigned with **WhatsApp secret code** style
- ✅ DeepSearch + Report plugin added
- ✅ Session `shavi&<base64>` format works
- ✅ All plugins rebranded to **SHAVIYA-XMD V4**
- ✅ GitHub 24/7 workflow with **auto restart every 5h**
- ✅ Heroku / Render / Railway deploy configs

---

## 🚀 Deploy

### 📌 Required: Get Session ID

1. Go to: `https://session.shaviya.tech` (or use a pairing code)
2. Login with your WhatsApp number
3. Copy the session ID (starts with `shavi&`)
4. Set it as `SESSION_ID` in your env

---

### ▶️ Local Run

```bash
git clone https://github.com/yourusername/SHAVIYA-XMD-V4
cd SHAVIYA-XMD-V4
cp .env.example .env   # edit .env with your SESSION_ID
npm install
node index.js
```

---

### 🌐 Heroku Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

1. Click button above
2. Fill in `SESSION_ID`, `OWNER_NUMBER`, `OWNER_NAME`
3. Deploy!

---

### 🚂 Railway Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Fork this repo
2. Connect Railway to your GitHub
3. Add env vars in Railway dashboard

---

### 🎨 Render Deploy

1. Fork this repo
2. New Web Service on Render → connect repo
3. Build: `npm install --legacy-peer-deps`
4. Start: `node index.js`
5. Add env vars

---

### ⚡ GitHub Actions 24/7

1. Fork this repo
2. Go to `Settings → Secrets → Actions`
3. Add secrets: `SESSION_ID`, `OWNER_NUMBER`, `OWNER_NAME`, etc.
4. Go to `Actions` tab → Enable workflows
5. Run `SHAVIYA-XMD V4 — 24/7 Auto Runner`

> Bot auto-restarts every 5 hours to stay within GitHub's 6h limit

---

## ⚙️ Environment Variables

| Key | Description | Required |
|-----|-------------|----------|
| `SESSION_ID` | WhatsApp session (`shavi&...` or MEGA link) | ✅ |
| `OWNER_NUMBER` | Your WhatsApp number (no +) | ✅ |
| `OWNER_NAME` | Your name | ✅ |
| `PREFIX` | Bot prefix (default `.`) | ❌ |
| `MODE` | `public` / `private` / `inbox` / `groups` | ❌ |
| `MONGODB_URI` | MongoDB URI for persistent data | ❌ |
| `GEMINI_API_KEY` | Google Gemini AI key | ❌ |
| `OPENAI_API_KEY` | OpenAI key | ❌ |

---

## 📋 Commands (175+ plugins)

Type `.menu` to get the full interactive menu.

---

## 💎 Credits

- **Developer**: SHAVIYA TECH
- **Owner**: Savendra
- **Base**: Baileys (@whiskeysockets/baileys)
