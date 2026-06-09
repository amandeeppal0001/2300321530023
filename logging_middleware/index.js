import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { LOG } from './logger.js';

const app = express();
const PORT = process.env.port || 3000;

app.use(cors()); 
app.use(express.json());

const REQUEST_LOGGER_MIDDLEWARE = (req, res, next) => {
    const method = req.method;
    const url = req.url;

    LOG("backend", "info", "middleware", `Incoming ${method} request to ${url}`);
    next(); 
};

app.use(REQUEST_LOGGER_MIDDLEWARE);

app.get('/api/users', (req, res) => {
    LOG("backend", "debug", "controller", "Successfully fetched users data");
    res.send('UserData');
});

app.get('/api/health', (req, res) => {
    LOG("backend", "debug", "controller", "Health check status: OK");
    res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
    LOG("backend", "info", "config", `Server started and listening on port ${PORT}`);
});