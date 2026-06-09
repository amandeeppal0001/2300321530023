import 'dotenv/config';

const ALLOWED_STACKS = ['backend', 'frontend'];
const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const BACKEND_PACKAGES = [
    'cache', 'controller', 'cron_job', 'db', 'domain', 
    'handler', 'repository', 'route', 'service', 
    'auth', 'config', 'middleware', 'utils'
];
const FRONTEND_PACKAGES = [
    'api', 'component', 'hook', 'page', 'state', 'style', 
    'auth', 'config', 'middleware', 'utils'
];

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

export const LOG = async (STACK, LEVEL, PKG, MESSAGE) => {
    const url = "http://4.224.186.213/evaluation-service/logs";

    const NORM_STACK = String(STACK).toLowerCase();
    const NORM_LEVEL = String(LEVEL).toLowerCase();
    const NORM_PKG = String(PKG).toLowerCase();

    if (!ALLOWED_STACKS.includes(NORM_STACK)) return;
    if (!ALLOWED_LEVELS.includes(NORM_LEVEL)) return;

    const ALLOWED_PACKAGES = NORM_STACK === 'backend' ? BACKEND_PACKAGES : FRONTEND_PACKAGES;
    if (!ALLOWED_PACKAGES.includes(NORM_PKG)) return;

    const TOKEN = await GET_VALID_TOKEN();
    if (!TOKEN) return;

    const PAYLOAD = { 
        stack: NORM_STACK, 
        level: NORM_LEVEL, 
        package: NORM_PKG, 
        message: MESSAGE 
    };

    try {
        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}` 
            },
            body: JSON.stringify(PAYLOAD)
        });
    } catch (error) {}
};