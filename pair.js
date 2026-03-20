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
    let sessionSent = false;

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

            // Register listeners FIRST
            client.ev.on('creds.update', saveCreds);

            client.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    try {
                        await delay(2000);
                        const credPath = `${process.cwd()}/temp/${id}/creds.json`;
                        if (!fs.existsSync(credPath)) {
                            console.log('[NEXUS-BOT] creds.json not found');
                            return;
                        }
                        const data = fs.readFileSync(credPath);
                        const b64data = 'NEXUS-MD:~' + Buffer.from(data).toString('base64');
                        const session = await client.sendMessage(client.user.id, { text: b64data });

                        await client.sendMessage(client.user.id, {
                            text: "```NEXUS-BOT has been linked to your WhatsApp account! Do not share this session_id with anyone.\n\nCopy and paste it on the SESSION string during deploy.\n\nGoodluck 🎉```"
                        }, { quoted: session });

                        sessionSent = true;
                        console.log('[NEXUS-BOT] Session sent successfully!');
                        await delay(300);
                        await client.ws.close();
                        removeFile('./temp/' + id);
                    } catch (err) {
                        console.log('[NEXUS-BOT] Error sending session:', err.message);
                        removeFile('./temp/' + id);
                    }
                } else if (connection === 'close') {
                    // Only reconnect if session hasn't been sent yet and not logged out
                    if (!sessionSent && lastDisconnect?.error?.output?.statusCode !== 401) {
                        await delay(3000);
                        NEXUSBOT();
                    }
                }
            });

            // Request pairing code after listeners are set
            if (!client.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await client.requestPairingCode(num, "NEXUSBOT");
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

        } catch (err) {
            console.log('[NEXUS-BOT] error:', err.message);
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    await NEXUSBOT();
});

module.exports = router;
