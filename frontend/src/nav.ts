const SESSION_USER_KEY = 'curvea.session.user';

const storageGet = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const storageRemove = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignorado: algunos navegadores bloquean persistencia.
    }
};

const isLoginPage = (): boolean => window.location.pathname.endsWith('/login.html');

const initNav = (): void => {
    const user = storageGet(SESSION_USER_KEY);
    const requiresAuth = document.body.dataset.requiresAuth === 'true';

    if (requiresAuth && !user) {
        window.location.replace('/login.html');
        return;
    }

    const userLabel = document.getElementById('currentUser');
    if (userLabel) {
        userLabel.textContent = user ? `Usuario: ${user}` : 'Sin sesion';
    }

    const logoutButton = document.getElementById('btnLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            storageRemove(SESSION_USER_KEY);
            window.location.replace('/login.html');
        });
    }

    if (isLoginPage() && user) {
        const loginMessage = document.getElementById('loginMessage');
        if (loginMessage) {
            loginMessage.textContent = `Sesion activa como ${user}. Puedes ir al graficador.`;
        }
    }
};

initNav();

export {};
