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
                        await res.end(await QRCode.toBuffer(qr));
                    }
                }
                if (connection === "open") {
                    await client.sendMessage(client.user.id, { text: 'Generating your session_id... wait a moment' });
                    await delay(50000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(8000);
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await client.sendMessage(client.user.id, { text: '' + b64data });

                    let Textt = "```NEXUS-BOT has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy as it will be used for authentication.\n\nIncase you are facing any issue reach us via:\n\nhttps://wa.me/message/YNDA2RFTE35LB1\n\nGoodluck 🎉```";

                    await client.sendMessage(client.user.id, { text: Textt }, { quoted: session });
                    await delay(100);
                    await client.ws.close();
                    return await removeFile("temp/" + id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output?.statusCode != 401) {
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
