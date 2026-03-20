const { makeid } = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let sessionSent = false;

    async function NEXUSBOT() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        const { version } = await fetchLatestBaileysVersion();
        const logger = pino({ level: "silent" });

        try {
            let client = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.macOS("Desktop"),
            });

            // Register listeners FIRST
            client.ev.on('creds.update', saveCreds);

            client.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'image/png');
                        await res.end(await QRCode.toBuffer(qr));
                    }
                }

                if (connection === "open") {
                    try {
                        await delay(2000);
                        const credPath = `${process.cwd()}/temp/${id}/creds.json`;
                        if (!fs.existsSync(credPath)) {
                            console.log('[NEXUS-BOT QR] creds.json not found');
                            return;
                        }
                        let data = fs.readFileSync(credPath);
                        let b64data = 'NEXUS-MD;' + Buffer.from(data).toString('base64');
                        let session = await client.sendMessage(client.user.id, { text: b64data });

                        await client.sendMessage(client.user.id, {
                            text: "```NEXUS-BOT has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy.\n\nGoodluck 🎉```"
                        }, { quoted: session });

                        sessionSent = true;
                        console.log('[NEXUS-BOT QR] Session sent successfully!');
                        await delay(300);
                        await client.ws.close();
                        return removeFile("temp/" + id);
                    } catch (err) {
                        console.log('[NEXUS-BOT QR] Error sending session:', err.message);
                        removeFile("temp/" + id);
                    }
                } else if (connection === "close") {
                    if (!sessionSent && lastDisconnect?.error?.output?.statusCode != 401) {
                        await delay(3000);
                        NEXUSBOT();
                    }
                }
            });

        } catch (err) {
            if (!res.headersSent) {
                await res.json({ code: "Service is Currently Unavailable" });
            }
            console.log('[NEXUS-BOT QR] Error:', err.message);
            await removeFile("temp/" + id);
        }
    }

    return await NEXUSBOT();
});

module.exports = router;
