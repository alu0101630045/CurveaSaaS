const SESSION_USER_KEY = 'curvea.session.user';

const storageSet = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

const setLoginMessage = (message: string): void => {
    const status = document.getElementById('loginMessage');
    if (status) {
        status.textContent = message;
    }
};

const authRequest = async (mode: 'login' | 'register', user: string, pass: string): Promise<string> => {
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: user, password: pass })
    });

    let payload: { error?: string; message?: string } = {};
    try {
        payload = (await response.json()) as { error?: string; message?: string };
    } catch {
        payload = {};
    }

    if (!response.ok) {
        throw new Error(payload.error || 'No se pudo completar la operacion de autenticacion.');
    }

    return payload.message || 'Operacion completada.';
};

const initLogin = (): void => {
    const form = document.getElementById('loginForm') as HTMLFormElement | null;
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitEvent = event as SubmitEvent;
        const submitter = submitEvent.submitter as HTMLButtonElement | null;
        const mode = submitter?.value === 'register' ? 'register' : 'login';

        const user = (document.getElementById('loginUser') as HTMLInputElement | null)?.value.trim() || '';
        const pass = (document.getElementById('loginPass') as HTMLInputElement | null)?.value.trim() || '';

        if (user.length < 3 || pass.length < 4) {
            setLoginMessage('Introduce un usuario de al menos 3 caracteres y una contrasena de 4 o mas.');
            return;
        }

        try {
            const message = await authRequest(mode, user, pass);
            storageSet(SESSION_USER_KEY, user);
            setLoginMessage(message);
            window.location.assign('/graficador.html');
        } catch (error) {
            setLoginMessage(error instanceof Error ? error.message : 'Error de autenticacion.');
        }
    });
};

initLogin();

export {};
