const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const router = express.Router();

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function NEXUSBOT() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        const { version } = await fetchLatestBaileysVersion();
        const logger = pino({ level: 'silent' });

        try {
            const client = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.windows('Edge'),
            });

            if (!client.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await client.requestPairingCode(num, "NEXUSBOT");
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            client.ev.on('creds.update', saveCreds);

            client.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                    try {
                        await delay(5000);
                        const credPath = `${process.cwd()}/temp/${id}/creds.json`;
                        if (!fs.existsSync(credPath)) {
                            console.log('creds.json not found at:', credPath);
                            return;
                        }
                        const data = fs.readFileSync(credPath);
                        const b64data = 'NEXUS-MD;' + Buffer.from(data).toString('base64');
                        const session = await client.sendMessage(client.user.id, { text: b64data });

                        await client.sendMessage(client.user.id, {
                            text: "```NEXUS-BOT has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy as it will be used for authentication.\n\nIncase you are facing any issue reach us via:\n\nhttps://wa.me/message/YNDA2RFTE35LB1\n\nGoodluck 🎉```"
                        }, { quoted: session });

                        await delay(500);
                        await client.ws.close();
                        removeFile('./temp/' + id);
                    } catch (err) {
                        console.log('Error sending session:', err);
                        removeFile('./temp/' + id);
                    }
                } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    NEXUSBOT();
                }
            });
        } catch (err) {
            console.log('service restarted', err);
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    await NEXUSBOT();
});

module.exports = router;
