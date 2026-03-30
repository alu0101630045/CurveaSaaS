import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3000;
const CPP_BACKEND_URL = process.env.CPP_BACKEND_URL || 'http://127.0.0.1:8080/api/plot';

type UserRow = {
    username: string;
    password_hash: string;
};

type ArticleRow = {
    id: number;
    author: string;
    title: string;
    expression: string;
    summary: string;
    findings: string;
    tags: string;
    created_at: string;
};

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

const hashPassword = (password: string): string => crypto.createHash('sha256').update(password).digest('hex');
const isValidUsername = (value: string): boolean => value.length >= 3 && value.length <= 32;
const isValidPassword = (value: string): boolean => value.length >= 4;
const parseTags = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => Boolean(item));
};

const getCurrentIsoDate = (): string => new Date().toISOString();

// Middleware fundamental para poder recibir datos JSON en el body
app.use(express.json());

// Servir archivos estáticos
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.post('/api/plot', async (req, res) => {
    try {
        const upstream = await fetch(CPP_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const payload = await upstream.text();
        res.status(upstream.status);

        try {
            res.json(JSON.parse(payload));
        } catch {
            res.type('application/json').send(payload);
        }
    } catch (error) {
        console.error('[Servidor] Error conectando con backend C++:', error);
        res.status(502).json({
            error: 'No se pudo contactar con el backend C++ en el puerto 8080.'
        });
    }
});

app.post('/api/auth/register', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!isValidUsername(username)) {
        res.status(400).json({ error: 'El usuario debe tener entre 3 y 32 caracteres.' });
        return;
    }

    if (!isValidPassword(password)) {
        res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres.' });
        return;
    }

    const existsStmt = db.prepare('SELECT username FROM users WHERE username = ?');
    const existing = existsStmt.get(username) as Pick<UserRow, 'username'> | undefined;
    if (existing) {
        res.status(409).json({ error: 'El usuario ya existe.' });
        return;
    }

    const insertStmt = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)');
    insertStmt.run(username, hashPassword(password), getCurrentIsoDate());

    res.status(201).json({ message: 'Usuario registrado correctamente.', username });
});

app.post('/api/auth/login', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!username || !password) {
        res.status(400).json({ error: 'Usuario y contrasena son obligatorios.' });
        return;
    }

    const stmt = db.prepare('SELECT username, password_hash FROM users WHERE username = ?');
    const user = stmt.get(username) as UserRow | undefined;
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

    const rows = stmt.all() as ArticleRow[];
    const articles = rows.map((row) => ({
        id: String(row.id),
        author: row.author,
        title: row.title,
        expression: row.expression,
        summary: row.summary,
        findings: row.findings,
        tags: JSON.parse(row.tags) as string[],
        createdAt: row.created_at
    }));

    res.status(200).json({ articles });
});

app.post('/api/articles', (req, res) => {
    const author = typeof req.body?.author === 'string' ? req.body.author.trim() : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const expression = typeof req.body?.expression === 'string' ? req.body.expression.trim() : '';
    const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
    const findings = typeof req.body?.findings === 'string' ? req.body.findings.trim() : '';
    const tags = parseTags(req.body?.tags);

    if (!author || !title || !expression || !summary || !findings) {
        res.status(400).json({ error: 'Todos los campos obligatorios deben estar completos.' });
        return;
    }

    const authorExistsStmt = db.prepare('SELECT username FROM users WHERE username = ?');
    const authorExists = authorExistsStmt.get(author) as Pick<UserRow, 'username'> | undefined;
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