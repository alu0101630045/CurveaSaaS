var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
const app = express();
const PORT = 3000;
const CPP_BACKEND_URL = process.env.CPP_BACKEND_URL || 'http://127.0.0.1:8080/api/plot';
const databaseDir = path.join(__dirname, '../database');
const databasePath = path.join(databaseDir, 'curvea.db');
fs.mkdirSync(databaseDir, { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    expression TEXT NOT NULL,
    summary TEXT NOT NULL,
    findings TEXT NOT NULL,
    tags TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(author) REFERENCES users(username)
);
`);
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');
const isValidUsername = (value) => value.length >= 3 && value.length <= 32;
const isValidPassword = (value) => value.length >= 4;
const parseTags = (raw) => {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => Boolean(item));
};
const getCurrentIsoDate = () => new Date().toISOString();
// Middleware fundamental para poder recibir datos JSON en el body
app.use(express.json());
// Servir archivos estáticos
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));
app.post('/api/plot', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const upstream = yield fetch(CPP_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        const payload = yield upstream.text();
        res.status(upstream.status);
        try {
            res.json(JSON.parse(payload));
        }
        catch (_a) {
            res.type('application/json').send(payload);
        }
    }
    catch (error) {
        console.error('[Servidor] Error conectando con backend C++:', error);
        res.status(502).json({
            error: 'No se pudo contactar con el backend C++ en el puerto 8080.'
        });
    }
}));
app.post('/api/auth/register', (req, res) => {
    var _a, _b;
    const username = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.username) === 'string' ? req.body.username.trim() : '';
    const password = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) === 'string' ? req.body.password.trim() : '';
    if (!isValidUsername(username)) {
        res.status(400).json({ error: 'El usuario debe tener entre 3 y 32 caracteres.' });
        return;
    }
    if (!isValidPassword(password)) {
        res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres.' });
        return;
    }
    const existsStmt = db.prepare('SELECT username FROM users WHERE username = ?');
    const existing = existsStmt.get(username);
    if (existing) {
        res.status(409).json({ error: 'El usuario ya existe.' });
        return;
    }
    const insertStmt = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)');
    insertStmt.run(username, hashPassword(password), getCurrentIsoDate());
    res.status(201).json({ message: 'Usuario registrado correctamente.', username });
});
app.post('/api/auth/login', (req, res) => {
    var _a, _b;
    const username = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.username) === 'string' ? req.body.username.trim() : '';
    const password = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) === 'string' ? req.body.password.trim() : '';
    if (!username || !password) {
        res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' });
        return;
    }
    const stmt = db.prepare('SELECT username, password_hash FROM users WHERE username = ?');
    const user = stmt.get(username);
    if (!user || user.password_hash !== hashPassword(password)) {
        res.status(401).json({ error: 'Credenciales invalidas.' });
        return;
    }
    res.status(200).json({ message: 'Inicio de sesion correcto.', username: user.username });
});
app.get('/api/articles', (_req, res) => {
    const stmt = db.prepare(`
        SELECT id, author, title, expression, summary, findings, tags, created_at
        FROM articles
        ORDER BY datetime(created_at) DESC, id DESC
    `);
    const rows = stmt.all();
    const articles = rows.map((row) => ({
        id: String(row.id),
        author: row.author,
        title: row.title,
        expression: row.expression,
        summary: row.summary,
        findings: row.findings,
        tags: JSON.parse(row.tags),
        createdAt: row.created_at
    }));
    res.status(200).json({ articles });
});
app.post('/api/articles', (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const author = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.author) === 'string' ? req.body.author.trim() : '';
    const title = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.title) === 'string' ? req.body.title.trim() : '';
    const expression = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.expression) === 'string' ? req.body.expression.trim() : '';
    const summary = typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.summary) === 'string' ? req.body.summary.trim() : '';
    const findings = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.findings) === 'string' ? req.body.findings.trim() : '';
    const tags = parseTags((_f = req.body) === null || _f === void 0 ? void 0 : _f.tags);
    if (!author || !title || !expression || !summary || !findings) {
        res.status(400).json({ error: 'Todos los campos obligatorios deben estar completos.' });
        return;
    }
    const authorExistsStmt = db.prepare('SELECT username FROM users WHERE username = ?');
    const authorExists = authorExistsStmt.get(author);
    if (!authorExists) {
        res.status(401).json({ error: 'Debes iniciar sesion con un usuario valido.' });
        return;
    }
    const createdAt = getCurrentIsoDate();
    const insertStmt = db.prepare(`
        INSERT INTO articles (author, title, expression, summary, findings, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(author, title, expression, summary, findings, JSON.stringify(tags), createdAt);
    res.status(201).json({
        message: 'Articulo publicado correctamente.',
        article: {
            id: String(result.lastInsertRowid),
            author,
            title,
            expression,
            summary,
            findings,
            tags,
            createdAt
        }
    });
});
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
