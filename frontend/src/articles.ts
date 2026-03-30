type Article = {
    id: string;
    author: string;
    title: string;
    expression: string;
    summary: string;
    findings: string;
    tags: string[];
    createdAt: string;
};

const SESSION_USER_KEY = 'curvea.session.user';
const LAST_FUNCTION_KEY = 'curvea.lastFunction';

const storageGet = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const setMessage = (message: string): void => {
    const el = document.getElementById('articleMessage');
    if (el) {
        el.textContent = message;
    }
};

const loadArticles = async (): Promise<Article[]> => {
    try {
        const response = await fetch('/api/articles');
        if (!response.ok) {
            return [];
        }

        const payload = (await response.json()) as { articles?: unknown };
        const parsed = payload.articles;
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((item): item is Article => {
            if (!item || typeof item !== 'object') {
                return false;
            }

            const candidate = item as Partial<Article>;
            return (
                typeof candidate.id === 'string' &&
                typeof candidate.author === 'string' &&
                typeof candidate.title === 'string' &&
                typeof candidate.expression === 'string' &&
                typeof candidate.summary === 'string' &&
                typeof candidate.findings === 'string' &&
                Array.isArray(candidate.tags) &&
                typeof candidate.createdAt === 'string'
            );
        });
    } catch {
        return [];
    }
};

const renderArticles = async (): Promise<void> => {
    const list = document.getElementById('articleList');
    if (!list) {
        return;
    }

    const articles = await loadArticles();
    list.innerHTML = '';

    if (articles.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'subtitle';
        empty.textContent = 'No hay articulos publicados todavia.';
        list.appendChild(empty);
        return;
    }

    const sorted = [...articles].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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
};

const initArticleHelpers = (): void => {
    const useCurrentButton = document.getElementById('btnUseCurrentFunction');
    if (useCurrentButton) {
        useCurrentButton.addEventListener('click', () => {
            const field = document.getElementById('articleFunction') as HTMLInputElement | null;
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

const initArticleForm = (): void => {
    const form = document.getElementById('articleForm') as HTMLFormElement | null;
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = (document.getElementById('articleTitle') as HTMLInputElement | null)?.value.trim() || '';
        const expression = (document.getElementById('articleFunction') as HTMLInputElement | null)?.value.trim() || '';
        const summary = (document.getElementById('articleSummary') as HTMLTextAreaElement | null)?.value.trim() || '';
        const findings = (document.getElementById('articleFindings') as HTMLTextAreaElement | null)?.value.trim() || '';
        const tagsRaw = (document.getElementById('articleTags') as HTMLInputElement | null)?.value.trim() || '';
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
            const response = await fetch('/api/articles', {
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

            let payload: { error?: string; message?: string } = {};
            try {
                payload = (await response.json()) as { error?: string; message?: string };
            } catch {
                payload = {};
            }

            if (!response.ok) {
                setMessage(payload.error || 'No se pudo publicar el articulo.');
                return;
            }

            await renderArticles();
            form.reset();
            setMessage(payload.message || 'Articulo publicado correctamente.');
        } catch {
            setMessage('No se pudo conectar con el servidor.');
        }
    });
};

const initArticles = async (): Promise<void> => {
    initArticleHelpers();
    initArticleForm();
    await renderArticles();
};

void initArticles();

export {};
