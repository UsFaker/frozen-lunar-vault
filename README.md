# 🌌 Frozen Lunar Vault

A lightweight, visually stunning, fully responsive personal information vault featuring "Space/Cyberpunk" dual-theme hidden unlock mechanisms and **client-side AES-256-GCM encryption** to protect your privacy.

Perfectly suited for deployment on 1 vCPU / 1 GiB lightweight cloud servers to store your accounts, passwords, notes, records, and server configurations.

*Read this in other languages: [简体中文](README_zh-CN.md)*

---

## ✨ Core Features

- **🔐 True Zero-Knowledge Architecture**: All your passwords, notes, and record data are encrypted using **AES-256 locally in your browser** before being sent to the server. The server database only stores ciphertext.
- **🌌 Stunning Hidden Unlock Mechanisms**:
  - **Cosmic Theme**: The page is a starry sky with falling meteors. You need to click 5 specific "invisible stars" in an exact sequence to unlock and enter.
  - **Cyberpunk Theme**: The page is a terminal matrix interface. Click Greek letters in a specific sequence to unlock. (Themes can be switched anytime via the bottom right icon).
- **🚀 Ultra Lightweight**:
  - Pure frontend HTML + handcrafted CSS effects (0 UI framework bloat, extremely fast response).
  - Node.js + `better-sqlite3` backend (single-file database, zero configuration, minimal system RAM usage).
- **📱 Fully Responsive**: Desktop displays a wide-screen grid card layout, while mobile automatically adapts to a bottom navigation bar.

---

## 🛠️ Quick Deployment

Environment requirement: Node.js >= 18

### 1. Get the Code
```bash
git clone https://github.com/UsFaker/frozen-lunar-vault.git
cd frozen-lunar-vault
```

### 2. Install Dependencies & Configure
```bash
npm install

# Copy environment template
cp .env.example .env
```
*(Note: In the `.env` file, `UNLOCK_HASH` corresponds to the SHA256 hash of your pattern sequence. The currently configured default pattern is the hash for the string sequence `0,1,2,3,4`)*

### 3. Start the Server
```bash
# Start local dev/testing server
npm start
```
Access the stunning unlock interface by opening `http://localhost:3000` in your browser.

---

## 🤔 How to Use (Local Demo Guide)

1. **Unlock the System**: 
   - The default password sequence is the first 5 hidden stars/letters. You can test the mechanism by clicking the **"💡 显示解锁提示" (Show Unlock Hint)** button in the top right corner to temporarily reveal their exact positions (numbers 1~5).
   - Clicking them in order triggers a "space jump / terminal hack" animation and logs you into the system.
2. **Adding Records**:
   - Once inside, click the `+` button in the bottom right corner.
   - Categories include: `🔑 Accounts`, `📝 Notes`, `📋 Records`, `💻 Code/Config`.
   - When you click "Save", the data is instantly encrypted into AES-256 ciphertext in your browser before being dispatched to the backend SQLite database.

---

> By [UsFaker](https://github.com/UsFaker) - "Your secrets belong to the stars."
