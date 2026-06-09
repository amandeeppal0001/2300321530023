import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { LOG } from '../logging_middleware/logger.js';
import { MIN_HEAP, COMPARE_NOTIFICATIONS } from './minHeap.js';

const app = express();
const PORT = process.env.port || 5000;

app.use(cors());
app.use(express.json());

let NOTIFICATIONS = [];
const READ_IDS = new Set();
let CACHED_TOKEN = process.env.accessToken || null;

function IS_TOKEN_EXPIRED(TOKEN) {
    if (!TOKEN) return true;
    try {
        const PAYLOAD_BASE64 = TOKEN.split('.')[1];
        if (!PAYLOAD_BASE64) return true;
        const DECODED = JSON.parse(Buffer.from(PAYLOAD_BASE64, 'base64').toString());
        const EXP = DECODED.exp || (DECODED.MapClaims && DECODED.MapClaims.exp);
        if (!EXP) return true;
        const NOW_IN_SECS = Math.floor(Date.now() / 1000);
        return EXP - NOW_IN_SECS < 10;
    } catch (error) {
        return true;
    }
}

async function GET_VALID_TOKEN() {
    if (!IS_TOKEN_EXPIRED(CACHED_TOKEN)) {
        return CACHED_TOKEN;
    }

    const EMAIL = process.env.email;
    const NAME = process.env.name;
    const ROLL_NO = process.env.rollNo;
    const ACCESS_CODE = process.env.accessCode;
    const CLIENT_ID = process.env.clientId;
    const CLIENT_SECRET = process.env.clientSecret;

    if (!EMAIL || !NAME || !ROLL_NO || !ACCESS_CODE || !CLIENT_ID || !CLIENT_SECRET) {
        return CACHED_TOKEN;
    }

    try {
        const response = await fetch("http://4.224.186.213/evaluation-service/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: EMAIL,
                name: NAME,
                rollNo: ROLL_NO,
                accessCode: ACCESS_CODE,
                clientID: CLIENT_ID,
                clientSecret: CLIENT_SECRET
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.access_token) {
                CACHED_TOKEN = data.access_token;
                return CACHED_TOKEN;
            }
        }
    } catch (error) {}

    return CACHED_TOKEN;
}

async function SYNC_EXTERNAL_NOTIFICATIONS() {
    const TOKEN = await GET_VALID_TOKEN();
    if (!TOKEN) return;

    try {
        const response = await fetch("http://4.224.186.213/evaluation-service/notifications", {
            headers: { "Authorization": `Bearer ${TOKEN}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.notifications)) {
                const NEW_NOTIFS = data.notifications.map(item => ({
                    ID: item.ID || item.id,
                    Type: item.Type || item.type,
                    Message: item.Message || item.message,
                    Timestamp: item.Timestamp || item.timestamp
                }));

                const EXISTING_IDS = new Set(NOTIFICATIONS.map(n => n.ID));
                for (const item of NEW_NOTIFS) {
                    if (!EXISTING_IDS.has(item.ID)) {
                        NOTIFICATIONS.push(item);
                    }
                }
            }
        }
    } catch (error) {}
}

const REQUEST_LOGGER_MIDDLEWARE = (req, res, next) => {
    const method = req.method;
    const url = req.url;
    LOG("backend", "info", "middleware", `Incoming ${method} request to ${url}`);
    next();
};

app.use(REQUEST_LOGGER_MIDDLEWARE);

app.get('/api/notifications', async (req, res) => {
    await SYNC_EXTERNAL_NOTIFICATIONS();
    LOG("backend", "debug", "controller", "Successfully fetched all notifications");
    res.json({ notifications: NOTIFICATIONS });
});

app.get('/api/notifications/priority', async (req, res) => {
    await SYNC_EXTERNAL_NOTIFICATIONS();

    const LIMIT = parseInt(req.query.limit) || 10;
    const UNREAD = NOTIFICATIONS.filter(item => !READ_IDS.has(item.ID));

    const HEAP = new MIN_HEAP();

    for (const item of UNREAD) {
        if (HEAP.SIZE() < LIMIT) {
            HEAP.INSERT(item);
        } else {
            const MIN_ITEM = HEAP.PEEK();
            if (COMPARE_NOTIFICATIONS(item, MIN_ITEM) > 0) {
                HEAP.EXTRACT_MIN();
                HEAP.INSERT(item);
            }
        }
    }

    const RESULT = [];
    while (HEAP.SIZE() > 0) {
        RESULT.push(HEAP.EXTRACT_MIN());
    }
    RESULT.reverse();

    LOG("backend", "debug", "controller", `Successfully computed priority inbox with limit ${LIMIT}`);
    res.json({ notifications: RESULT });
});

app.post('/api/notifications', async (req, res) => {
    const { type, message, timestamp } = req.body;

    if (!type || !message) {
        LOG("backend", "warn", "controller", "Validation failed: missing type or message");
        return res.status(400).json({ error: "Missing type or message" });
    }

    const NEW_NOTIF = {
        ID: crypto.randomUUID(),
        Type: type,
        Message: message,
        Timestamp: timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    NOTIFICATIONS.push(NEW_NOTIF);

    LOG("backend", "info", "controller", `Created new notification: ${NEW_NOTIF.ID}`);
    res.status(201).json(NEW_NOTIF);
});

app.post('/api/notifications/:id/read', async (req, res) => {
    const id = req.params.id;
    READ_IDS.add(id);
    LOG("backend", "info", "controller", `Marked notification ${id} as read`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    LOG("backend", "info", "service", `Notification backend listening on port ${PORT}`);
});
