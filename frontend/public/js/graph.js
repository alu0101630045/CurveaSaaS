var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const CANVAS_PADDING = 40;
const LAST_FUNCTION_KEY = 'curvea.lastFunction';
const storageSet = (key, value) => {
    try {
        localStorage.setItem(key, value);
    }
    catch (_a) {
        // Ignorado: si no hay persistencia, la grafica sigue funcionando.
    }
};
const setStatus = (message) => {
    const status = document.getElementById('estado');
    if (status) {
        status.textContent = message;
    }
};
const renderAnalysis = (data) => {
    const taylor = document.getElementById('taylor');
    const asintotas = document.getElementById('asintotas');
    const cortes = document.getElementById('cortes');
    if (taylor) {
        const terms = data.taylor
            .map((coef, idx) => {
            if (coef === null || !Number.isFinite(coef)) {
                return null;
            }
            const abs = Math.abs(coef);
            const sign = coef >= 0 ? (idx === 0 ? '' : ' + ') : ' - ';
            if (idx === 0) {
                return `${coef.toFixed(5)}`;
            }
            if (idx === 1) {
                return `${sign}${abs.toFixed(5)}x`;
            }
            return `${sign}${abs.toFixed(5)}x^${idx}`;
        })
            .filter((v) => v !== null)
            .join('');
        taylor.textContent = terms ? `f(x) ≈ ${terms}` : 'No se pudo aproximar la serie de Taylor.';
    }
    if (asintotas) {
        asintotas.innerHTML = '';
        if (data.asymptotes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No se detectaron asintotas en este analisis numerico.';
            asintotas.appendChild(li);
        }
        else {
            data.asymptotes.forEach((item) => {
                const li = document.createElement('li');
                li.textContent = `${item.type}: ${item.equation}`;
                asintotas.appendChild(li);
            });
        }
    }
    if (cortes) {
        cortes.innerHTML = '';
        if (data.yIntercept) {
            const liy = document.createElement('li');
            liy.textContent = `Eje Y: (0, ${data.yIntercept.y.toFixed(6)})`;
            cortes.appendChild(liy);
        }
        else {
            const liy = document.createElement('li');
            liy.textContent = 'Eje Y: no definido';
            cortes.appendChild(liy);
        }
        if (data.xIntercepts.length === 0) {
            const lix = document.createElement('li');
            lix.textContent = 'Eje X: no se detectaron cortes';
            cortes.appendChild(lix);
        }
        else {
            data.xIntercepts.slice(0, 8).forEach((p, idx) => {
                const li = document.createElement('li');
                li.textContent = `Eje X #${idx + 1}: (${p.x.toFixed(6)}, ${p.y.toFixed(6)})`;
                cortes.appendChild(li);
            });
        }
    }
};
const getFiniteYValues = (points) => points
    .filter((p) => typeof p.y === 'number' && Number.isFinite(p.y))
    .map((p) => p.y);
const drawAxes = (ctx, width, height, yZeroPixel, xZeroPixel) => {
    ctx.strokeStyle = 'rgba(31, 41, 55, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, yZeroPixel);
    ctx.lineTo(width - CANVAS_PADDING, yZeroPixel);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xZeroPixel, CANVAS_PADDING);
    ctx.lineTo(xZeroPixel, height - CANVAS_PADDING);
    ctx.stroke();
};
const drawCurve = (plotData) => {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const yValues = getFiniteYValues(plotData.points);
    if (yValues.length === 0) {
        setStatus('No hay puntos validos para dibujar en el rango indicado.');
        return;
    }
    const rawMinY = Math.min(...yValues);
    const rawMaxY = Math.max(...yValues);
    const yMargin = Math.max((rawMaxY - rawMinY) * 0.1, 1);
    const yMin = rawMinY - yMargin;
    const yMax = rawMaxY + yMargin;
    const toPixelX = (x) => {
        const w = width - CANVAS_PADDING * 2;
        return CANVAS_PADDING + ((x - plotData.xMin) / (plotData.xMax - plotData.xMin)) * w;
    };
    const toPixelY = (y) => {
        const h = height - CANVAS_PADDING * 2;
        return height - CANVAS_PADDING - ((y - yMin) / (yMax - yMin)) * h;
    };
    const xZeroPixel = toPixelX(0);
    const yZeroPixel = toPixelY(0);
    drawAxes(ctx, width, height, yZeroPixel, xZeroPixel);
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let drawingSegment = false;
    for (const point of plotData.points) {
        if (point.y === null || !Number.isFinite(point.y)) {
            drawingSegment = false;
            continue;
        }
        const px = toPixelX(point.x);
        const py = toPixelY(point.y);
        if (!drawingSegment) {
            ctx.moveTo(px, py);
            drawingSegment = true;
        }
        else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
};
const solicitarPuntos = () => __awaiter(void 0, void 0, void 0, function* () {
    const input = document.getElementById('funcionInput');
    if (!input) {
        return;
    }
    const expression = input.value.trim();
    if (!expression) {
        setStatus('Escribe una funcion antes de graficar.');
        return;
    }
    storageSet(LAST_FUNCTION_KEY, expression);
    setStatus('Calculando puntos en backend...');
    try {
        const response = yield fetch('/api/plot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                expression,
                xMin: -10,
                xMax: 10,
                samples: 600,
                taylorOrder: 6
            })
        });
        const data = yield response.json();
        if (!response.ok) {
            setStatus(data.error || 'No se pudo calcular la funcion.');
            return;
        }
        drawCurve(data);
        renderAnalysis(data);
        setStatus(`Funcion graficada: f(x) = ${expression}`);
    }
    catch (error) {
        console.error('Error solicitando puntos:', error);
        setStatus('Fallo de red o servidor no disponible.');
    }
});
const initGraph = () => {
    const button = document.getElementById('btnGraficar');
    const input = document.getElementById('funcionInput');
    if (button) {
        button.addEventListener('click', solicitarPuntos);
    }
    if (input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                solicitarPuntos();
            }
        });
    }
    solicitarPuntos();
};
initGraph();
export {};
