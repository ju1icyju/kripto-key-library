# Universal Key Library (keys-lmao) 🗝️

> **Explore the vast universe of numbers. Search for lost treasures in the noise.**

![Preview](public/vite.svg)

## 🌌 Overview

**Universal Key Library** is a visual interface for the $2^{256}$ private key space of Bitcoin and Ethereum. It demonstrates the sheer immensity of cryptographic security through a "Dark Sci-Fi" terminal interface.

Every possible private key exists somewhere in this library. The problem is finding one with a balance.

**Live Demo:** [https://ju1icyju.github.io/kripto-key-library/](https://ju1icyju.github.io/kripto-key-library/)

## ✨ Features

*   **Real-Time Data:** Uses public JSON-RPC nodes (Ankr, Binance) to check balances for 128 keys at a time.
*   **Visual Interface:** "Matrix-style" scanning effects, CRT monitors, and glassmorphism UI.
*   **Zero Logs:** 100% Client-Side. Private keys are generated locally in your browser and never sent to any server.
*   **Educational:** Learn about the math behind $2^{256}$ and why "brute-forcing" crypto is impossible.
*   **Gamification:** Persisted "Random Clicks" counter to track your journey through the void.

## 🛠️ Tech Stack

*   **Core:** React + TypeScript + Vite
*   **Styling:** TailwindCSS (v4)
*   **Crypto:** `ethers.js`, `bitcoinjs-lib`, `tiny-secp256k1`
*   **Deployment:** GitHub Pages

## 🚀 Development

```bash
# Install dependencies
npm install

# Start local server
npm run dev

# Build for production
npm run build
```

## ⚠️ Disclaimer

**This project is for educational purposes only.**
The probability of finding a private key with a balance is effectively zero ($1$ in $10^{77}$).
Do not use this tool to generate wallets for storing real funds.
Never share your private keys found here or elsewhere.

## 📄 License

MIT License. Free to explore, fork, and learn.
