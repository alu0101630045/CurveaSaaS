"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const SESSION_USER_KEY = 'curvea.session.user';
const LAST_FUNCTION_KEY = 'curvea.lastFunction';
const storageGet = (key) => {
    try {
        return localStorage.getItem(key);
    }
    catch (_a) {
        return null;
    }
};
const setMessage = (message) => {
    const el = document.getElementById('articleMessage');
    if (el) {
        el.textContent = message;
    }
};
const loadArticles = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch('/api/articles');
        if (!response.ok) {
            return [];
        }
        const payload = (yield response.json());
        const parsed = payload.articles;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((item) => {
            if (!item || typeof item !== 'object') {
                return false;
            }
            const candidate = item;
            return (typeof candidate.id === 'string' &&
                typeof candidate.author === 'string' &&
                typeof candidate.title === 'string' &&
                typeof candidate.expression === 'string' &&
                typeof candidate.summary === 'string' &&
                typeof candidate.findings === 'string' &&
                Array.isArray(candidate.tags) &&
                typeof candidate.createdAt === 'string');
        });
    }
    catch (_a) {
        return [];
    }
});
const renderArticles = () => __awaiter(void 0, void 0, void 0, function* () {
    const list = document.getElementById('articleList');
    if (!list) {
        return;
    }
    const articles = yield loadArticles();
    list.innerHTML = '';
    if (articles.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'subtitle';
        empty.textContent = 'No hay articulos publicados todavia.';
        list.appendChild(empty);
        return;
    }
    const sorted = [...articles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sorted.forEach((article) => {
        const card = document.createElement('article');
        card.className = 'article-card';
        const title = document.createElement('h4');
        title.textContent = article.title;
        const meta = document.createElement('p');
        meta.className = 'article-meta';
        meta.textContent = `${article.author} | ${new Date(article.createdAt).toLocaleString('es-ES')} | f(x) = ${article.expression}`;
        const summary = document.createElement('p');
        summary.textContent = article.summary;
        const findings = document.createElement('p');
        findings.textContent = article.findings;
        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(summary);
        card.appendChild(findings);
        if (article.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'article-tags';
            article.tags.forEach((tag) => {
                const chip = document.createElement('span');
                chip.textContent = tag;
                tagsContainer.appendChild(chip);
            });
            card.appendChild(tagsContainer);
        }
        list.appendChild(card);
    });
});
const initArticleHelpers = () => {
    const useCurrentButton = document.getElementById('btnUseCurrentFunction');
    if (useCurrentButton) {
        useCurrentButton.addEventListener('click', () => {
            const field = document.getElementById('articleFunction');
            if (!field) {
                return;
            }
            const currentExpression = storageGet(LAST_FUNCTION_KEY) || '';
            if (!currentExpression) {
                setMessage('No hay funcion activa guardada en el graficador.');
                return;
            }
            field.value = currentExpression;
            setMessage('Funcion activa copiada.');
        });
    }
};
const initArticleForm = () => {
    const form = document.getElementById('articleForm');
    if (!form) {
        return;
    }
    form.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        event.preventDefault();
        const title = ((_a = document.getElementById('articleTitle')) === null || _a === void 0 ? void 0 : _a.value.trim()) || '';
        const expression = ((_b = document.getElementById('articleFunction')) === null || _b === void 0 ? void 0 : _b.value.trim()) || '';
        const summary = ((_c = document.getElementById('articleSummary')) === null || _c === void 0 ? void 0 : _c.value.trim()) || '';
        const findings = ((_d = document.getElementById('articleFindings')) === null || _d === void 0 ? void 0 : _d.value.trim()) || '';
        const tagsRaw = ((_e = document.getElementById('articleTags')) === null || _e === void 0 ? void 0 : _e.value.trim()) || '';
        const author = storageGet(SESSION_USER_KEY) || 'anonimo';
        if (!title || !expression || !summary || !findings) {
            setMessage('Completa todos los campos obligatorios para publicar.');
            return;
        }
        const tags = tagsRaw
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => Boolean(tag));
        try {
            const response = yield fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    author,
                    title,
                    expression,
                    summary,
                    findings,
                    tags
                })
            });
            let payload = {};
            try {
                payload = (yield response.json());
            }
            catch (_f) {
                payload = {};
            }
            if (!response.ok) {
                setMessage(payload.error || 'No se pudo publicar el articulo.');
                return;
            }
            yield renderArticles();
            form.reset();
            setMessage(payload.message || 'Articulo publicado correctamente.');
        }
        catch (_g) {
            setMessage('No se pudo conectar con el servidor.');
        }
    }));
};
const initArticles = () => __awaiter(void 0, void 0, void 0, function* () {
    initArticleHelpers();
    initArticleForm();
    yield renderArticles();
});
void initArticles();
