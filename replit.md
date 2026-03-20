# NEXUS-MD Session Generator

## Project Overview
A WhatsApp session generator (NEXUS-MD) built with Node.js and Express. Allows users to generate WhatsApp session credentials via QR code or pairing code using the Baileys library.

## Architecture
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **WhatsApp Library**: @whiskeysockets/baileys (wileys)
- **Port**: 5000

## Project Structure
```
nexus-pair/
├── index.js       # Express server entry point (port 5000)
├── pair.js        # Pairing code route handler (/code)
├── qr.js          # QR code route handler (/qr)
├── id.js          # Random ID generator utility
├── main.html      # Landing page with PAIR CODE / QR SCAN buttons
├── pair.html      # Pairing code UI
├── app.json       # Heroku/deployment config
├── package.json   # Dependencies
└── temp/          # Temporary session storage (gitignored)
```

## Session Prefix
Sessions are generated with the prefix **NEXUS-MD**.

## Routes
- `/` — Landing page
- `/pair` — Pairing code UI
- `/qr` — QR code scan page
- `/code?number=<phone>` — API to get pairing code
