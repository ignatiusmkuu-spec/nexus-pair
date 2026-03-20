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
                        await delay(5000);
                        const credPath = `${process.cwd()}/temp/${id}/creds.json`;
                        if (!fs.existsSync(credPath)) {
                            console.log('creds.json not found at:', credPath);
                            return;
                        }
                        let data = fs.readFileSync(credPath);
                        let b64data = 'NEXUS-MD;' + Buffer.from(data).toString('base64');
                        let session = await client.sendMessage(client.user.id, { text: b64data });

                        let Textt = "```NEXUS-BOT has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy as it will be used for authentication.\n\nIncase you are facing any issue reach us via:\n\nhttps://wa.me/message/YNDA2RFTE35LB1\n\nGoodluck 🎉```";

                        await client.sendMessage(client.user.id, { text: Textt }, { quoted: session });
                        await delay(500);
                        await client.ws.close();
                        return removeFile("temp/" + id);
                    } catch (err) {
                        console.log('Error sending session:', err);
                        removeFile("temp/" + id);
                    }
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode != 401) {
                    await delay(10000);
                    NEXUSBOT();
                }
            });
        } catch (err) {
            if (!res.headersSent) {
                await res.json({ code: "Service is Currently Unavailable" });
            }
            console.log(err);
            await removeFile("temp/" + id);
        }
    }

    return await NEXUSBOT();
});

module.exports = router;
