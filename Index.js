// ============================
// WHATSAPP BOT - RAILWAY READY
// ============================

const {
    default: makeWASocket,
    DisconnectReason,
    useSingleFileAuthState,
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");

// ==== SESSION FILE ====
const SESSION_FILE_PATH = process.env.SESSION_FILE || "/data/auth_info.json";
const authFile = path.resolve(SESSION_FILE_PATH);
const dirPath = path.dirname(authFile);

// Pastikan direktori session ada
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

const { state, saveState } = useSingleFileAuthState(authFile);

// ==== OWNER ====
const OWNER = process.env.OWNER_JID || "owner@s.whatsapp.net";

async function startBot() {
    console.log("🚀 Memulai WhatsApp Bot ...");

    const sock = makeWASocket({
        printQRInTerminal: false, // kita pakai qrcode-terminal manual
        auth: state,
    });

    // ==== Cetak QR ====
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📌 QR Terdeteksi — Silakan Scan Pakai HP");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            if (reason === DisconnectReason.loggedOut) {
                console.log("❌ Logged Out — Menghapus session...");
                if (fs.existsSync(authFile)) fs.unlinkSync(authFile);
                return startBot();
            } else {
                console.log("⚠️ Koneksi terputus — mencoba sambung ulang...");
                return startBot();
            }
        }

        if (connection === "open") {
            console.log("✅ Bot Berhasil Terhubung ke WhatsApp!");
        }
    });

    // ==== Simpan session otomatis ====
    sock.ev.on("creds.update", saveState);

    // ==== Handler Pesan ====
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        console.log(`📩 Pesan masuk dari ${from} : ${text}`);

        // ===== REPLY OTOMATIS =====
        if (text.toLowerCase() === "ping") {
            return sock.sendMessage(from, { text: "pong 🏓" });
        }

        if (text.toLowerCase() === "menu") {
            return sock.sendMessage(from, {
                text:
                    `📜 *MENU BOT*\n\n` +
                    `1. ping → cek bot\n` +
                    `2. info → informasi bot\n` +
                    `3. menu → tampilkan menu ini\n\n` +
                    `Bot aktif ✔️`,
            });
        }

        if (text.toLowerCase() === "info") {
            return sock.sendMessage(from, {
                text:
                    `🤖 *WhatsApp Bot*\n` +
                    `• Status: Online\n` +
                    `• Owner: ${OWNER}\n` +
                    `• Dibuat dengan Baileys\n`,
            });
        }

        // ===== Chat dua arah =====
        if (from !== "status@broadcast") {
            return sock.sendMessage(from, {
                text: `Kamu bilang: *${text}*`,
            });
        }
    });
}

startBot();
