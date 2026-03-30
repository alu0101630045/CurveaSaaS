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
const storageSet = (key, value) => {
    try {
        localStorage.setItem(key, value);
        return true;
    }
    catch (_a) {
        return false;
    }
};
const setLoginMessage = (message) => {
    const status = document.getElementById('loginMessage');
    if (status) {
        status.textContent = message;
    }
};
const authRequest = (mode, user, pass) => __awaiter(void 0, void 0, void 0, function* () {
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const response = yield fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: user, password: pass })
    });
    let payload = {};
    try {
        payload = (yield response.json());
    }
    catch (_a) {
        payload = {};
    }
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudo completar la operacion de autenticacion.');
    }
    return payload.message || 'Operacion completada.';
});
const initLogin = () => {
    const form = document.getElementById('loginForm');
    if (!form) {
        return;
    }
    form.addEventListener('submit', (event) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        event.preventDefault();
        const submitEvent = event;
        const submitter = submitEvent.submitter;
        const mode = (submitter === null || submitter === void 0 ? void 0 : submitter.value) === 'register' ? 'register' : 'login';
        const user = ((_a = document.getElementById('loginUser')) === null || _a === void 0 ? void 0 : _a.value.trim()) || '';
        const pass = ((_b = document.getElementById('loginPass')) === null || _b === void 0 ? void 0 : _b.value.trim()) || '';
        if (user.length < 3 || pass.length < 4) {
            setLoginMessage('Introduce un usuario de al menos 3 caracteres y una contrasena de 4 o mas.');
            return;
        }
        try {
            const message = yield authRequest(mode, user, pass);
            storageSet(SESSION_USER_KEY, user);
            setLoginMessage(message);
            window.location.assign('/graficador.html');
        }
        catch (error) {
            setLoginMessage(error instanceof Error ? error.message : 'Error de autenticacion.');
        }
    }));
};
initLogin();
