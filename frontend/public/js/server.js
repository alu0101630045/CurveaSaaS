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
const app = express();
const PORT = 3000;
const CPP_BACKEND_URL = process.env.CPP_BACKEND_URL || 'http://127.0.0.1:8080/api/plot';
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
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
